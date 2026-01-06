import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkGfm from 'remark-gfm';

const postsDirectory = path.join(process.cwd(), 'docs');

export interface Post {
  slug: string; // 格式：一级分类/二级分类/文件名（不含扩展名）
  title: string;
  date: string;
  year: string;
  content: string;
  htmlContent: string;
  category: string; // 一级分类
  subCategory: string; // 二级分类
  toc?: TOCItem[]; // 文章目录
}

export interface TOCItem {
  level: number;
  title: string;
  id: string;
  children?: TOCItem[];
}

export interface CategoryInfo {
  category: string; // 一级分类
  subCategories: SubCategoryInfo[]; // 二级分类列表
}

export interface SubCategoryInfo {
  subCategory: string; // 二级分类名
  posts: Post[]; // 该二级分类下的文章
}

export interface ArchivePeriod {
  period: string; // 如 "2025上半年"
  posts: Post[];
}

// 解析日期字符串（支持 frontmatter 中的 date 字段和文件名）
function parseDateString(dateStr: string): { date: string; year: string } | null {
  if (!dateStr) return null;
  
  // 格式 1: 24-11-25 或 24-8-19 (支持一位数的月份和日期)
  if (dateStr.match(/^\d{2}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = dateStr.split('-');
    const fullYear = year.startsWith('20') ? year : `20${year}`;
    return {
      date: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      year: fullYear,
    };
  }
  
  // 格式 2: 25.12.29 或 26.1.5 或 24.11.25 或 24.8.19 (支持一位数的月份和日期)
  if (dateStr.match(/^\d{2}\.\d{1,2}\.\d{1,2}$/)) {
    const [year, month, day] = dateStr.split('.');
    const fullYear = year.startsWith('20') ? year : `20${year}`;
    return {
      date: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      year: fullYear,
    };
  }
  
  return null;
}

// 从文件名提取日期
function parseDateFromFilename(filename: string): { date: string; year: string } {
  const nameWithoutExt = filename.replace(/\.md$/, '');
  const parsed = parseDateString(nameWithoutExt);
  
  if (parsed) {
    return parsed;
  }
  
  // 默认返回当前日期
  const currentYear = new Date().getFullYear().toString();
  return {
    date: new Date().toISOString().split('T')[0],
    year: currentYear,
  };
}

// 提取文章目录（TOC）
function extractTOC(content: string): TOCItem[] {
  const lines = content.split('\n');
  const toc: TOCItem[] = [];
  const stack: TOCItem[] = [];
  
  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      // 生成 ID（用于锚点）
      const id = title
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '');
      
      const item: TOCItem = { level, title, id };
      
      // 找到合适的父级
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        toc.push(item);
      } else {
        const parent = stack[stack.length - 1];
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      }
      
      stack.push(item);
    }
  });
  
  return toc;
}

// 获取所有文章（同步版本，不包含 HTML）
export function getAllPosts(): Post[] {
  const posts: Post[] = [];
  
  if (!fs.existsSync(postsDirectory)) {
    return posts;
  }
  
  // 遍历 docs 目录下的一级分类
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true });
  
  categories.forEach((categoryDir) => {
    if (!categoryDir.isDirectory()) return;
    
    const category = categoryDir.name;
    const categoryPath = path.join(postsDirectory, category);
    
    // 遍历二级分类
    const subCategories = fs.readdirSync(categoryPath, { withFileTypes: true });
    
    subCategories.forEach((subCategoryDir) => {
      if (!subCategoryDir.isDirectory()) return;
      
      const subCategory = subCategoryDir.name;
      const subCategoryPath = path.join(categoryPath, subCategory);
      
      // 遍历文章文件
      const files = fs.readdirSync(subCategoryPath);
      
      files.forEach((file) => {
        if (!file.endsWith('.md')) return;
        
        const filePath = path.join(subCategoryPath, file);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);
        
        // 优先使用 frontmatter 中的 date 字段，如果没有则从文件名解析
        let dateResult = parseDateString(data.date);
        if (!dateResult) {
          dateResult = parseDateFromFilename(file);
        }
        const { date, year } = dateResult;
        const slug = `${category}/${subCategory}/${file.replace(/\.md$/, '')}`;
        
        // 从内容第一行提取标题（如果 frontmatter 没有）
        let title = data.title || '';
        if (!title) {
          const firstLine = content.split('\n')[0];
          if (firstLine.startsWith('# ')) {
            title = firstLine.replace(/^#\s+/, '');
          } else {
            title = file.replace(/\.md$/, '');
          }
        }
        
        // 处理图片路径
        let processedContent = content;
        processedContent = processedContent.replace(
          /!\[([^\]]*)\]\(([^)]+)\)/g,
          (match, alt, imgPath) => {
            if (!imgPath.startsWith('http') && !imgPath.startsWith('/')) {
              const imagePath = `/api/image/${category}/${subCategory}/${imgPath}`;
              return `![${alt}](${imagePath})`;
            }
            return match;
          }
        );
        
        // 提取目录
        const toc = extractTOC(processedContent);
        
        posts.push({
          slug,
          title,
          date,
          year,
          content: processedContent,
          htmlContent: '', // 将在需要时异步生成
          category,
          subCategory,
          toc,
        });
      });
    });
  });
  
  // 按日期排序（最新的在前）
  return posts.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

// 异步获取所有文章（包含 HTML 内容）
export async function getAllPostsWithHtml(): Promise<Post[]> {
  const posts = getAllPosts();
  
  // 并行处理所有文章的 HTML 生成
  const postsWithHtml = await Promise.all(
    posts.map(async (post) => {
      if (post.htmlContent) {
        return post;
      }
      
      try {
        const processed = await remark()
          .use(remarkGfm)
          .use(remarkHtml, { sanitize: false })
          .process(post.content);
        return {
          ...post,
          htmlContent: processed.toString(),
        };
      } catch (error) {
        console.error(`Error processing markdown for ${post.slug}:`, error);
        return post;
      }
    })
  );
  
  return postsWithHtml;
}

// 根据 slug 获取文章
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const parts = slug.split('/');
  if (parts.length < 3) {
    return null;
  }
  
  const [category, subCategory, ...filenameParts] = parts;
  const filename = filenameParts.join('/') + '.md';
  const filePath = path.join(postsDirectory, category, subCategory, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  
  // 优先使用 frontmatter 中的 date 字段，如果没有则从文件名解析
  let dateResult = parseDateString(data.date);
  if (!dateResult) {
    dateResult = parseDateFromFilename(filename);
  }
  const { date, year } = dateResult;
  
  let title = data.title || '';
  if (!title) {
    const firstLine = content.split('\n')[0];
    if (firstLine.startsWith('# ')) {
      title = firstLine.replace(/^#\s+/, '');
    } else {
      title = filename.replace(/\.md$/, '');
    }
  }
  
  // 处理图片路径（相对路径转换为绝对路径）
  let processedContent = content;
  // 替换相对图片路径
  processedContent = processedContent.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, imgPath) => {
      if (!imgPath.startsWith('http') && !imgPath.startsWith('/')) {
        // 相对路径，转换为通过 API 路由访问
        const imagePath = `/api/image/${category}/${subCategory}/${imgPath}`;
        return `![${alt}](${imagePath})`;
      }
      return match;
    }
  );
  
  // 提取目录
  const toc = extractTOC(processedContent);
  
  // 将 Markdown 转换为 HTML
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(processedContent);
  
  let htmlContent = processed.toString();
  
  // 为 HTML 中的标题添加 ID 属性（用于目录跳转）
  htmlContent = htmlContent.replace(
    /<h([1-6])>(.*?)<\/h[1-6]>/g,
    (match, level, content) => {
      // 移除 HTML 标签，提取纯文本
      const text = content.replace(/<[^>]*>/g, '').trim();
      if (!text) return match;
      
      // 生成 ID（与 extractTOC 函数中的逻辑保持一致）
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '');
      
      return `<h${level} id="${id}">${content}</h${level}>`;
    }
  );
  
  return {
    slug,
    title,
    date,
    year,
    content: processedContent,
    htmlContent,
    category,
    subCategory,
    toc,
  };
}

// 获取所有年份
export function getAllYears(): string[] {
  const years: string[] = [];
  const yearsDir = ['2024', '2025', '2026'];
  
  yearsDir.forEach((year) => {
    const yearDir = path.join(postsDirectory, year);
    if (fs.existsSync(yearDir)) {
      const files = fs.readdirSync(yearDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      if (mdFiles.length > 0) {
        years.push(year);
      }
    }
  });
  
  return years.sort().reverse();
}

// 获取所有一级分类
export function getAllCategories(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  
  const categories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  
  return categories.sort();
}

// 根据一级分类获取分类信息（包含二级分类和文章）
export function getCategoryInfo(category: string): CategoryInfo | null {
  const categoryPath = path.join(postsDirectory, category);
  if (!fs.existsSync(categoryPath)) {
    return null;
  }
  
  const posts = getAllPosts().filter((post) => post.category === category);
  const subCategoryMap = new Map<string, Post[]>();
  
  posts.forEach((post) => {
    if (!subCategoryMap.has(post.subCategory)) {
      subCategoryMap.set(post.subCategory, []);
    }
    subCategoryMap.get(post.subCategory)!.push(post);
  });
  
  const subCategories: SubCategoryInfo[] = Array.from(subCategoryMap.entries())
    .map(([subCategory, posts]) => ({
      subCategory,
      posts: posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }))
    .sort((a, b) => a.subCategory.localeCompare(b.subCategory));
  
  return {
    category,
    subCategories,
  };
}

// 获取所有分类信息
export function getAllCategoryInfo(): CategoryInfo[] {
  const categories = getAllCategories();
  return categories
    .map((cat) => getCategoryInfo(cat))
    .filter((info): info is CategoryInfo => info !== null);
}

// 根据分类获取文章（兼容旧接口）
export function getPostsByCategory(category: string): Post[] {
  if (category === '全部' || category === '首页') {
    return getAllPosts();
  }
  return getAllPosts().filter((post) => post.category === category);
}

// 获取归档（按年份和半年分组）
export function getArchives(): ArchivePeriod[] {
  const posts = getAllPosts();
  const archiveMap = new Map<string, Post[]>();
  
  posts.forEach((post) => {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-11 -> 1-12
    const half = month <= 6 ? '上半年' : '下半年';
    const period = `${year}${half}`;
    
    if (!archiveMap.has(period)) {
      archiveMap.set(period, []);
    }
    archiveMap.get(period)!.push(post);
  });
  
  // 转换为数组并按时间倒序排序
  const archives: ArchivePeriod[] = Array.from(archiveMap.entries())
    .map(([period, posts]) => ({
      period,
      posts: posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }))
    .sort((a, b) => {
      // 提取年份和半年进行比较
      const aYear = parseInt(a.period.match(/\d{4}/)?.[0] || '0');
      const aHalf = a.period.includes('上半年') ? 0 : 1;
      const bYear = parseInt(b.period.match(/\d{4}/)?.[0] || '0');
      const bHalf = b.period.includes('上半年') ? 0 : 1;
      
      if (aYear !== bYear) {
        return bYear - aYear; // 年份倒序
      }
      return bHalf - aHalf; // 半年倒序
    });
  
  return archives;
}

// 根据归档期间获取文章
export function getPostsByArchive(period: string): Post[] {
  const archives = getArchives();
  const archive = archives.find((a) => a.period === period);
  return archive ? archive.posts : [];
}


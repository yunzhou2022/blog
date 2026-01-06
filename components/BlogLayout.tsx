"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Post, CategoryInfo, TOCItem } from "@/lib/posts";
import { format } from "date-fns";

interface BlogLayoutProps {
  initialCategoryInfo: CategoryInfo[];
}

export function BlogLayout({ initialCategoryInfo }: BlogLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null
  );
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // 加载文章内容
  const loadPost = useCallback(async (post: Post) => {
    setSelectedPost(post);
    setLoadingPost(true);

    // 如果文章没有 HTML 内容，从 API 获取
    if (!post.htmlContent) {
      try {
        const response = await fetch(`/api/post/${post.slug}`);
        if (response.ok) {
          const fullPost = await response.json();
          setSelectedPost(fullPost);
        }
      } catch (error) {
        console.error("Error loading post:", error);
      }
    }

    setLoadingPost(false);
  }, []);

  // 根据 URL 参数初始化状态
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subCategoryParam = searchParams.get('subCategory');
    const postSlug = searchParams.get('post');

    // 处理分类参数
    if (categoryParam) {
      const categoryInfo = initialCategoryInfo.find(c => c.category === categoryParam);
      if (categoryInfo) {
        // 只有当分类改变时才更新
        if (selectedCategory !== categoryParam) {
          setSelectedCategory(categoryParam);
        }
        setExpandedCategories(prev => new Set(prev).add(categoryParam));
        
        // 处理二级分类参数
        if (subCategoryParam) {
          const subCategoryInfo = categoryInfo.subCategories.find(
            s => s.subCategory === subCategoryParam
          );
          if (subCategoryInfo) {
            // 只有当二级分类改变时才更新
            if (selectedSubCategory !== subCategoryParam) {
              setSelectedSubCategory(subCategoryParam);
            }
            
            // 处理文章参数
            if (postSlug) {
              const post = subCategoryInfo.posts.find(p => p.slug === postSlug);
              if (post && (!selectedPost || selectedPost.slug !== postSlug)) {
                loadPost(post);
                return;
              }
            } else if (selectedPost) {
              // URL 中没有文章参数，但当前有选中的文章，清除文章选中
              setSelectedPost(null);
            }
          }
        } else {
          // 只有分类，没有二级分类
          if (selectedSubCategory) {
            setSelectedSubCategory(null);
          }
          if (selectedPost) {
            setSelectedPost(null);
          }
        }
      }
    } else {
      // 没有分类参数，清除所有选中状态
      if (selectedCategory || selectedSubCategory || selectedPost) {
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setSelectedPost(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 当前选中的分类信息
  const currentCategoryInfo = useMemo(() => {
    if (!selectedCategory) return null;
    return (
      initialCategoryInfo.find((info) => info.category === selectedCategory) ||
      null
    );
  }, [selectedCategory, initialCategoryInfo]);

  // 当前二级分类下的文章列表
  const currentSubCategoryPosts = useMemo<Post[] | null>(() => {
    if (!currentCategoryInfo || !selectedSubCategory) return null;
    const subCategoryInfo = currentCategoryInfo.subCategories.find(
      (sub) => sub.subCategory === selectedSubCategory
    );
    return subCategoryInfo?.posts || null;
  }, [currentCategoryInfo, selectedSubCategory]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (category: string) => {
    if (!expandedCategories.has(category)) {
      toggleCategory(category);
    }
    setSelectedCategory(category);
    setSelectedSubCategory(null);
    setSelectedPost(null);
    // 更新 URL，只包含分类
    router.push(`/?category=${encodeURIComponent(category)}`, { scroll: false });
  };

  const handleSubCategoryClick = (subCategory: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCategory) return;
    setSelectedSubCategory(subCategory);
    setSelectedPost(null);
    // 更新 URL，包含分类和二级分类
    router.push(
      `/?category=${encodeURIComponent(selectedCategory)}&subCategory=${encodeURIComponent(subCategory)}`,
      { scroll: false }
    );
  };

  const handlePostClick = async (post: Post, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // 确保分类和二级分类已设置
    if (!selectedCategory || !selectedSubCategory) {
      // 从文章信息中获取分类和二级分类
      setSelectedCategory(post.category);
      setSelectedSubCategory(post.subCategory);
      setExpandedCategories(prev => new Set(prev).add(post.category));
    }
    
    // 更新 URL，包含分类、二级分类和文章
    router.push(
      `/?category=${encodeURIComponent(post.category)}&subCategory=${encodeURIComponent(post.subCategory)}&post=${encodeURIComponent(post.slug)}`,
      { scroll: false }
    );
    
    // 加载文章
    await loadPost(post);
  };

  // 检查文章是否被选中
  const isPostSelected = (postSlug: string): boolean => {
    return selectedPost !== null && selectedPost.slug === postSlug;
  };

  // 渲染文章目录
  const renderTOC = (toc: TOCItem[], level = 0) => {
    if (!toc || toc.length === 0) return null;

    const handleTOCClick = (
      e: React.MouseEvent<HTMLAnchorElement>,
      id: string
    ) => {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${id}`);
      }
    };

    return (
      <ul className={`space-y-0.5 ${level > 0 ? "ml-3" : ""}`}>
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleTOCClick(e, item.id)}
              className={`block text-[13px] py-1 px-2 rounded-[3px] transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.055)] cursor-pointer ${
                item.level === 1 ? "font-medium" : ""
              }`}
              style={{ paddingLeft: `${level * 8 + 8}px` }}
            >
              {item.title}
            </a>
            {item.children && renderTOC(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-screen bg-white dark:bg-[#191919] overflow-hidden flex">
      {/* 左侧：Notion 风格的侧边栏 */}
      <aside className="w-64 h-full bg-white dark:bg-[#191919] border-r border-gray-200 dark:border-[#2e2e2e] flex flex-col">
        {/* 顶部 Logo/标题区域 */}
        <div className="px-2 py-3 border-b border-gray-200 dark:border-[#2e2e2e]">
          <div 
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2e2e2e] cursor-pointer"
            onClick={() => {
              setSelectedCategory(null);
              setSelectedSubCategory(null);
              setSelectedPost(null);
              router.replace('/');
            }}
          >
            <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-[#2e2e2e] text-sm font-medium">
              云
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              云粥的博客
            </span>
          </div>
        </div>

        {/* 导航树 */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <nav className="space-y-0.5">
            {initialCategoryInfo.map((categoryInfo) => {
              const isExpanded = expandedCategories.has(categoryInfo.category);
              const isSelected = selectedCategory === categoryInfo.category;

              return (
                <div key={categoryInfo.category}>
                  <div
                    className="flex items-center group"
                    onClick={() => handleCategoryClick(categoryInfo.category)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(categoryInfo.category);
                      }}
                      className="w-5 h-5 flex items-center justify-center mr-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-[#2e2e2e] rounded transition-opacity"
                    >
                      <svg
                        className={`w-3 h-3 text-gray-500 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <div
                      className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[14px] cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-[#1e3a5f] text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                      }`}
                    >
                      <span>{categoryInfo.category}</span>
                    </div>
                  </div>

                  {/* 二级分类 */}
                  {isExpanded && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {categoryInfo.subCategories.map((subCategoryInfo) => {
                        const isSubSelected =
                          selectedSubCategory === subCategoryInfo.subCategory &&
                          isSelected;

                        return (
                          <div key={subCategoryInfo.subCategory}>
                            <div
                              className={`flex items-center px-2 py-1 rounded-[3px] text-[13px] cursor-pointer transition-colors ${
                                isSubSelected
                                  ? "bg-blue-50 dark:bg-[#1e3a5f] text-blue-600 dark:text-blue-400"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                              }`}
                              onClick={(e) =>
                                handleSubCategoryClick(
                                  subCategoryInfo.subCategory,
                                  e
                                )
                              }
                            >
                              <span className="flex-1">
                                {subCategoryInfo.subCategory}
                              </span>
                            </div>

                            {/* 文章列表 */}
                            {isSubSelected && (
                              <div className="ml-4 mt-0.5 space-y-0.5">
                                {subCategoryInfo.posts.map((post) => {
                                  const isPostSelected =
                                    selectedPost?.slug === post.slug;

                                  return (
                                    <div
                                      key={post.slug}
                                      className={`px-2 py-1 rounded-[3px] text-[13px] cursor-pointer transition-colors ${
                                        isPostSelected
                                          ? "bg-blue-50 dark:bg-[#1e3a5f] text-blue-600 dark:text-blue-400"
                                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                                      }`}
                                      onClick={(e) => handlePostClick(post, e)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                          {format(
                                            new Date(post.date),
                                            "MM-dd"
                                          )}
                                        </span>
                                        <span className="flex-1 truncate">
                                          {post.title}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 中间：主内容区 - Notion 风格 */}
      <main className="flex-1 h-full overflow-y-auto bg-white dark:bg-[#191919] flex">
        {/* 文章目录（在文章左侧） */}
        {selectedPost && selectedPost.toc && selectedPost.toc.length > 0 && (
          <aside className="w-64 h-full border-r border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-[#191919] overflow-y-auto flex-shrink-0">
            <div className="px-4 py-6 sticky top-0">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                目录
              </div>
              {renderTOC(selectedPost.toc)}
            </div>
          </aside>
        )}

        {/* 文章内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {selectedPost ? (
            // 显示文章内容
            <article className="max-w-[900px] mx-auto px-16 py-12">
            <header className="mb-10">
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {selectedPost.title}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {format(new Date(selectedPost.date), "yyyy年MM月dd日")}
                </span>
                {selectedPost.category && (
                  <>
                    <span>•</span>
                    <span>{selectedPost.category}</span>
                    {selectedPost.subCategory && (
                      <>
                        <span>•</span>
                        <span>{selectedPost.subCategory}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </header>

            {loadingPost ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">加载中...</div>
              </div>
            ) : selectedPost.htmlContent ? (
              <div
                className="notion-content prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedPost.htmlContent }}
              />
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                内容加载失败
              </div>
            )}
          </article>
        ) : currentSubCategoryPosts && currentSubCategoryPosts.length > 0 ? (
          // 显示二级分类下的文章列表
          <div className="max-w-[900px] mx-auto px-16 py-12">
            <h1 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-gray-100">
              {selectedSubCategory}
            </h1>
            <div className="space-y-1">
              {currentSubCategoryPosts.map((post) => {
                const isSelected = isPostSelected(post.slug);
                return (
                  <button
                    key={post.slug}
                    onClick={() => handlePostClick(post)}
                    className={`w-full text-left px-3 py-2.5 rounded-[3px] transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-[#1e3a5f]"
                        : "hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(post.date), "yyyy-MM-dd")}
                      </span>
                      <span className="text-gray-400">–</span>
                      <span className="text-gray-900 dark:text-gray-100 flex-1">
                        {post.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : currentCategoryInfo ? (
          // 显示一级分类下的所有文章列表（按二级分类分组）
          <div className="max-w-[900px] mx-auto px-16 py-12">
            <h1 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-gray-100">
              {selectedCategory}
            </h1>
            <div className="space-y-10">
              {currentCategoryInfo.subCategories.map((subCategoryInfo) => (
                <div key={subCategoryInfo.subCategory}>
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    {subCategoryInfo.subCategory}
                  </h2>
                  <div className="space-y-1">
                    {subCategoryInfo.posts.map((post) => {
                      const isSelected = isPostSelected(post.slug);
                      return (
                        <button
                          key={post.slug}
                          onClick={() => handlePostClick(post)}
                          className={`w-full text-left px-3 py-2.5 rounded-[3px] transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-[#1e3a5f]"
                              : "hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(post.date), "yyyy-MM-dd")}
                            </span>
                            <span className="text-gray-400">–</span>
                            <span className="text-gray-900 dark:text-gray-100 flex-1">
                              {post.title}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 默认首页
          <div className="max-w-[900px] mx-auto px-16 py-12">
            <header className="mb-12">
              <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                云粥的博客
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {format(new Date(), "yyyy年MM月dd日")} yunzhou
              </p>
            </header>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                关于我
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-7">
                不知道写点什么、但还是希望能有点产出。日更！！！
              </p>
            </section>

            {initialCategoryInfo.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                  分类
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {initialCategoryInfo.map((categoryInfo) => {
                    // 计算该分类下的文章总数
                    const totalPosts = categoryInfo.subCategories.reduce(
                      (sum, subCategory) => sum + subCategory.posts.length,
                      0
                    );
                    return (
                      <button
                        key={categoryInfo.category}
                        onClick={() => handleCategoryClick(categoryInfo.category)}
                        className="text-left px-4 py-3 rounded-[3px] border border-gray-200 dark:border-[#2e2e2e] hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition-colors"
                      >
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {categoryInfo.category}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {categoryInfo.subCategories.length} 个二级分类 · {totalPosts} 篇文章
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  );
}

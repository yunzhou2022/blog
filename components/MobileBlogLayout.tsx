"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Post, CategoryInfo, TOCItem } from "@/lib/posts";
import { format } from "date-fns";

interface MobileBlogLayoutProps {
  initialCategoryInfo: CategoryInfo[];
}

export function MobileBlogLayout({ initialCategoryInfo }: MobileBlogLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [tocOpen, setTocOpen] = useState<boolean>(false);

  // 当侧边栏或目录打开时，禁用body滚动
  useEffect(() => {
    if (sidebarOpen || tocOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, tocOpen]);

  // 加载文章内容
  const loadPost = useCallback(async (post: Post) => {
    setSelectedPost(post);
    setLoadingPost(true);

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
    // 移动端打开文章时关闭侧边栏
    setSidebarOpen(false);
  }, []);

  // 根据 URL 参数初始化状态
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subCategoryParam = searchParams.get('subCategory');
    const postSlug = searchParams.get('post');

    if (categoryParam) {
      const categoryInfo = initialCategoryInfo.find(c => c.category === categoryParam);
      if (categoryInfo) {
        if (selectedCategory !== categoryParam) {
          setSelectedCategory(categoryParam);
        }
        setExpandedCategories(prev => new Set(prev).add(categoryParam));
        
        if (subCategoryParam) {
          const subCategoryInfo = categoryInfo.subCategories.find(
            s => s.subCategory === subCategoryParam
          );
          if (subCategoryInfo) {
            if (selectedSubCategory !== subCategoryParam) {
              setSelectedSubCategory(subCategoryParam);
            }
            
            if (postSlug) {
              const post = subCategoryInfo.posts.find(p => p.slug === postSlug);
              if (post && (!selectedPost || selectedPost.slug !== postSlug)) {
                loadPost(post);
                return;
              }
            } else if (selectedPost) {
              setSelectedPost(null);
            }
          }
        } else {
          if (selectedSubCategory) {
            setSelectedSubCategory(null);
          }
          if (selectedPost) {
            setSelectedPost(null);
          }
        }
      }
    } else {
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
    router.push(`/?category=${encodeURIComponent(category)}`, { scroll: false });
    setSidebarOpen(false);
  };

  const handleSubCategoryClick = (subCategory: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCategory) return;
    setSelectedSubCategory(subCategory);
    setSelectedPost(null);
    router.push(
      `/?category=${encodeURIComponent(selectedCategory)}&subCategory=${encodeURIComponent(subCategory)}`,
      { scroll: false }
    );
    setSidebarOpen(false);
  };

  const handlePostClick = async (post: Post, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!selectedCategory || !selectedSubCategory) {
      setSelectedCategory(post.category);
      setSelectedSubCategory(post.subCategory);
      setExpandedCategories(prev => new Set(prev).add(post.category));
    }
    
    router.push(
      `/?category=${encodeURIComponent(post.category)}&subCategory=${encodeURIComponent(post.subCategory)}&post=${encodeURIComponent(post.slug)}`,
      { scroll: false }
    );
    
    await loadPost(post);
  };

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
        setTocOpen(false);
      }
    };

    return (
      <ul className={`space-y-0.5 ${level > 0 ? "ml-3" : ""}`}>
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleTOCClick(e, item.id)}
              className={`block text-[13px] py-1.5 px-3 rounded-[3px] transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.055)] cursor-pointer ${
                item.level === 1 ? "font-medium" : ""
              }`}
              style={{ paddingLeft: `${level * 8 + 12}px` }}
            >
              {item.title}
            </a>
            {item.children && renderTOC(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  // 返回上一级
  const handleBack = () => {
    if (selectedPost) {
      // 如果有文章，返回到二级分类
      if (selectedCategory && selectedSubCategory) {
        router.push(
          `/?category=${encodeURIComponent(selectedCategory)}&subCategory=${encodeURIComponent(selectedSubCategory)}`,
          { scroll: false }
        );
        setSelectedPost(null);
      }
    } else if (selectedSubCategory) {
      // 如果有二级分类，返回到一级分类
      if (selectedCategory) {
        router.push(`/?category=${encodeURIComponent(selectedCategory)}`, { scroll: false });
        setSelectedSubCategory(null);
      }
    } else if (selectedCategory) {
      // 如果有一级分类，返回到首页
      router.replace('/', { scroll: false });
      setSelectedCategory(null);
    }
  };

  // 获取当前页面标题
  const getPageTitle = () => {
    if (selectedPost) return selectedPost.title;
    if (selectedSubCategory) return selectedSubCategory;
    if (selectedCategory) return selectedCategory;
    return '云粥的博客';
  };

  return (
    <div className="h-screen bg-white dark:bg-[#191919] overflow-hidden flex flex-col">
      {/* 顶部导航栏 - Notion移动端风格 */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-[#191919] flex-shrink-0 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 菜单按钮 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
            aria-label="打开菜单"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* 返回按钮 */}
          {(selectedPost || selectedSubCategory || selectedCategory) && (
            <button
              onClick={handleBack}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
              aria-label="返回"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* 标题 */}
          <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
            {getPageTitle()}
          </h1>
        </div>

        {/* 目录按钮（仅在文章页面显示） */}
        {selectedPost && selectedPost.toc && selectedPost.toc.length > 0 && (
          <button
            onClick={() => setTocOpen(true)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
            aria-label="打开目录"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 12h16M4 16h16"
              />
            </svg>
          </button>
        )}
      </header>

      {/* 侧边栏遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏抽屉 - Notion移动端风格 */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#191919] border-r border-gray-200 dark:border-[#2e2e2e] z-50 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* 侧边栏头部 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2e2e2e] flex items-center justify-between">
            <div 
              className="flex items-center gap-2 flex-1"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubCategory(null);
                setSelectedPost(null);
                router.replace('/');
                setSidebarOpen(false);
              }}
            >
              <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-[#2e2e2e] text-sm font-medium">
                云
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                云粥的博客
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
              aria-label="关闭菜单"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 导航树 */}
          <div className="flex-1 overflow-y-auto px-2 py-3">
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
                        className="w-6 h-6 flex items-center justify-center mr-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-[#2e2e2e] rounded transition-opacity"
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
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
                        className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-[3px] text-[14px] cursor-pointer transition-colors ${
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
                      <div className="ml-7 mt-0.5 space-y-0.5">
                        {categoryInfo.subCategories.map((subCategoryInfo) => {
                          const isSubSelected =
                            selectedSubCategory === subCategoryInfo.subCategory &&
                            isSelected;

                          return (
                            <div key={subCategoryInfo.subCategory}>
                              <div
                                className={`flex items-center px-2 py-1.5 rounded-[3px] text-[13px] cursor-pointer transition-colors ${
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
                                        className={`px-2 py-1.5 rounded-[3px] text-[13px] cursor-pointer transition-colors ${
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
        </div>
      </aside>

      {/* 目录抽屉遮罩层 */}
      {tocOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setTocOpen(false)}
        />
      )}

      {/* 目录抽屉 - 从底部弹出 */}
      {selectedPost && selectedPost.toc && selectedPost.toc.length > 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-[#191919] border-t border-gray-200 dark:border-[#2e2e2e] z-50 transform transition-transform duration-300 ease-out max-h-[70vh] flex flex-col ${
            tocOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2e2e2e] flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              目录
            </div>
            <button
              onClick={() => setTocOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
              aria-label="关闭目录"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {renderTOC(selectedPost.toc)}
          </div>
        </div>
      )}

      {/* 主内容区 - Notion移动端风格 */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
        {selectedPost ? (
          // 显示文章内容
          <article className="px-4 py-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">
                {selectedPost.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
          <div className="px-4 py-6">
            <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {selectedSubCategory}
            </h1>
            <div className="space-y-1">
              {currentSubCategoryPosts.map((post) => {
                const isSelected = isPostSelected(post.slug);
                return (
                  <button
                    key={post.slug}
                    onClick={() => handlePostClick(post)}
                    className={`w-full text-left px-3 py-3 rounded-[3px] transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-[#1e3a5f]"
                        : "hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(post.date), "yyyy-MM-dd")}
                      </span>
                      <span className="text-gray-400">–</span>
                      <span className="text-gray-900 dark:text-gray-100 flex-1 text-sm">
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
          <div className="px-4 py-6">
            <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {selectedCategory}
            </h1>
            <div className="space-y-6">
              {currentCategoryInfo.subCategories.map((subCategoryInfo) => (
                <div key={subCategoryInfo.subCategory}>
                  <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    {subCategoryInfo.subCategory}
                  </h2>
                  <div className="space-y-1">
                    {subCategoryInfo.posts.map((post) => {
                      const isSelected = isPostSelected(post.slug);
                      return (
                        <button
                          key={post.slug}
                          onClick={() => handlePostClick(post)}
                          className={`w-full text-left px-3 py-3 rounded-[3px] transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-[#1e3a5f]"
                              : "hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(post.date), "yyyy-MM-dd")}
                            </span>
                            <span className="text-gray-400">–</span>
                            <span className="text-gray-900 dark:text-gray-100 flex-1 text-sm">
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
          <div className="px-4 py-6">
            <header className="mb-8">
              <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100">
                云粥的博客
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(), "yyyy年MM月dd日")} yunzhou
              </p>
            </header>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                关于我
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-6 text-sm">
                不知道写点什么、但还是希望能有点产出。日更！！！
              </p>
            </section>

            {initialCategoryInfo.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  分类
                </h2>
                <div className="space-y-2">
                  {initialCategoryInfo.map((categoryInfo) => {
                    const totalPosts = categoryInfo.subCategories.reduce(
                      (sum, subCategory) => sum + subCategory.posts.length,
                      0
                    );
                    return (
                      <button
                        key={categoryInfo.category}
                        onClick={() => handleCategoryClick(categoryInfo.category)}
                        className="w-full text-left px-4 py-3 rounded-[3px] border border-gray-200 dark:border-[#2e2e2e] hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition-colors"
                      >
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {categoryInfo.category}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
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
      </main>
    </div>
  );
}


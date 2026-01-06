import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import { format } from 'date-fns';

interface PageProps {
  params: {
    slug: string[];
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug.split('/'),
  }));
}

export default async function PostPage({ params }: PageProps) {
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-8 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回首页
        </Link>

        {/* Article */}
        <article className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <header className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-700 dark:text-blue-300">
                {post.year}
              </span>
              <span>
                {format(new Date(post.date), 'yyyy年MM月dd日')}
              </span>
            </div>
          </header>

          {/* Content */}
          <div
            className="markdown-content prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.htmlContent }}
          />
        </article>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            ← 返回文章列表
          </Link>
        </footer>
      </div>
    </div>
  );
}


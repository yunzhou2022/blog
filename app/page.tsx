import { Suspense } from 'react';
import { getAllCategoryInfo } from '@/lib/posts';
import { BlogLayout } from '@/components/BlogLayout';

export default function Home() {
  const categoryInfo = getAllCategoryInfo();
  
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">加载中...</div>}>
      <BlogLayout
        initialCategoryInfo={categoryInfo}
      />
    </Suspense>
  );
}

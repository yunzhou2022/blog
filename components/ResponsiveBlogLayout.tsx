"use client";

import { useState, useEffect } from "react";
import { BlogLayout } from "./BlogLayout";
import { MobileBlogLayout } from "./MobileBlogLayout";
import { CategoryInfo } from "@/lib/posts";
import { isMobileDevice } from "@/lib/device";

interface ResponsiveBlogLayoutProps {
  initialCategoryInfo: CategoryInfo[];
}

export function ResponsiveBlogLayout({ initialCategoryInfo }: ResponsiveBlogLayoutProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // 客户端渲染后设置mounted标志
    setMounted(true);
    
    // 初始检测
    const checkDevice = () => {
      setIsMobile(isMobileDevice());
    };
    
    checkDevice();

    // 监听窗口大小变化
    const handleResize = () => {
      checkDevice();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 服务端渲染时，默认使用桌面端布局（避免hydration不匹配）
  if (!mounted) {
    return <BlogLayout initialCategoryInfo={initialCategoryInfo} />;
  }

  // 客户端渲染后，根据设备类型选择布局
  return isMobile ? (
    <MobileBlogLayout initialCategoryInfo={initialCategoryInfo} />
  ) : (
    <BlogLayout initialCategoryInfo={initialCategoryInfo} />
  );
}


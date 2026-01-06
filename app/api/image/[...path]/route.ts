import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = params.path;
    if (!imagePath || imagePath.length < 2) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // 新格式：category/subCategory/filename
    // 旧格式兼容：year/filename
    const filename = imagePath.slice(-1)[0];
    const restPath = imagePath.slice(0, -1);
    
    // 尝试新路径：docs/category/subCategory/filename
    let filePath = path.join(process.cwd(), 'docs', ...restPath, filename);
    
    // 如果新路径不存在，尝试旧路径：year/filename
    if (!fs.existsSync(filePath) && restPath.length === 1) {
      filePath = path.join(process.cwd(), restPath[0], filename);
    }

    // 安全检查：确保文件在允许的目录内
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(process.cwd());
    if (!resolvedPath.startsWith(allowedDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // 根据文件扩展名设置 Content-Type
    const contentTypeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


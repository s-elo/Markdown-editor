import { inlineImageConfig } from '@milkdown/kit/component/image-inline';
import { uploadConfig, Uploader } from '@milkdown/kit/plugin/upload';

import type { Ctx } from '@milkdown/kit/ctx';
import type { Node } from '@milkdown/kit/prose/model';

import { SERVER_PORT } from '@/constants';

export function getImageUrl(url: string) {
  if (url.startsWith('/')) {
    return `http://127.0.0.1:${SERVER_PORT}/api/imgs${url}`;
  }
  return url;
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/api/imgs/upload`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  return json.data as string;
}

const uploader: Uploader = async (files, schema) => {
  const images: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files.item(i);
    if (!file) {
      continue;
    }

    // we only handle image here.
    if (!file.type.includes('image')) {
      continue;
    }

    images.push(file);
  }

  const nodes: Node[] = await Promise.all(
    images.map(async (image) => {
      const src = await uploadImage(image);
      const alt = image.name;
      return schema.nodes.image.createAndFill({
        src,
        alt,
      })!;
    }),
  );

  return nodes;
};

export const configureImageUploader = (ctx: Ctx) => {
  ctx.update(uploadConfig.key, (prev) => {
    return {
      ...prev,
      uploader,
    };
  });

  ctx.update(inlineImageConfig.key, (prev) => {
    return {
      ...prev,
      proxyDomURL: getImageUrl,
      onUpload: uploadImage,
    };
  });
};

import { inlineImageConfig } from '@milkdown/kit/component/image-inline';
import { uploadConfig, type Uploader } from '@milkdown/kit/plugin/upload';

import type { Ctx } from '@milkdown/kit/ctx';
import type { Node } from '@milkdown/kit/prose/model';

export type ImageUploader = (file: File) => Promise<string>;

export interface ImageUploadOptions {
  uploadImage?: ImageUploader;
  getImageUrl?: (url: string) => string;
}

const unavailableUploader: ImageUploader = () => {
  throw new Error('Image uploading is not configured for this editor.');
};

export const getImageUrl = (url: string) => url;

export async function uploadImage(file: File) {
  return unavailableUploader(file);
}

export function configureImageUploader(ctx: Ctx, options: ImageUploadOptions = {}) {
  const uploader = options.uploadImage ?? unavailableUploader;
  const resolveImageUrl = options.getImageUrl ?? getImageUrl;
  const uploadFiles: Uploader = async (files, schema) => {
    const images = [...Array.from(files)].filter((file) => file.type.includes('image'));
    const nodes: Node[] = await Promise.all(
      images.map(
        async (image) =>
          schema.nodes.image.createAndFill({
            src: await uploader(image),
            alt: image.name,
          })!,
      ),
    );
    return nodes;
  };

  ctx.update(uploadConfig.key, (previous) => ({ ...previous, uploader: uploadFiles }));
  ctx.update(inlineImageConfig.key, (previous) => ({
    ...previous,
    proxyDomURL: resolveImageUrl,
    onUpload: uploader,
  }));
}

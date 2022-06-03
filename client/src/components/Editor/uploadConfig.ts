import { upload, uploadPlugin } from "@milkdown/plugin-upload";
import type { Node } from "prosemirror-model";
import { useUploadImgMutation } from "@/redux-api/imgStoreApi";
import Toast from "@/utils/Toast";

const uploader = ([uploadimgMutation]: ReturnType<
  typeof useUploadImgMutation
>) =>
  upload.configure(uploadPlugin, {
    uploader: async (files, schema) => {
      const images: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) {
          continue;
        }

        // You can handle whatever the file type you want, we handle image here.
        if (!file.type.includes("image")) {
          continue;
        }

        images.push(file);
      }

      const nodes: Node[] = await Promise.all(
        images.map(async (image) => {
          let src = "";
          let alt = "";

          try {
            const resp = await uploadimgMutation({
              imgFile: image,
              fileName: `${Date.now()}-${image.name}`,
            }).unwrap();

            if (resp.err === 1 || resp.status !== 200)
              throw new Error(resp.message);

            src = `${resp.requestUrls[0]}`;
            alt = `${Date.now()}-${image.name}`;

            Toast(resp.message, "SUCCESS");
          } catch (err) {
            Toast(`failed to upload: ${String(err)}`, "ERROR");
            src = `http://markdown-img-store.oss-cn-shenzhen.aliyuncs.com/snow2.png`;
            alt = image.name;
          }

          return schema.nodes.image.createAndFill({
            src,
            alt,
          }) as Node;
        })
      );

      return nodes;
    },
  });

export default uploader;

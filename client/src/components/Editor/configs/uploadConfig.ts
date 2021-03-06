import { upload, uploadPlugin } from "@milkdown/plugin-upload";
import type { Node } from "prosemirror-model";
import { useUploadImgMutation } from "@/redux-api/imgStoreApi";
import { dateFormat } from "@/utils/utils";
import Toast from "@/utils/Toast";

const uploader = (
  [uploadimgMutation]: ReturnType<typeof useUploadImgMutation>,
  curPath: string
) =>
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

      const data = await Promise.all(
        images.map(async (image) => {
          let src = "";
          let alt = "";

          try {
            const resp = await uploadimgMutation({
              imgFile: image,
              fileName: `${curPath}_${dateFormat(
                new Date(Date.now()),
                "YYYY-MM-DD-HH:mm:ss"
              )}.${image.name.split(".")[1]}`,
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

          return {
            src,
            alt,
          };
        })
      );

      return data.map(
        ({ src, alt }) =>
          schema.nodes.image.createAndFill({
            src,
            alt,
          }) as Node
      );
    },
  });

export default uploader;

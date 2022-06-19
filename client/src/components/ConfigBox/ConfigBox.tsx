import React, { useRef, useState } from "react";
import Modal from "../Modal/Modal";

import "./ConfigBox.less";

export type ConfigBoxProps = {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ConfigBox({ setShow }: ConfigBoxProps) {
  const [ignorDirs, setIgnoreDirs] = useState<string[]>(["img", ".git"]);
  const formRef = useRef(null);
  const ignoreDirsRef = useRef<HTMLInputElement[]>([]);

  const updateConfigs = async () => {
    if (!formRef.current) return;

    const configs = {};

    const formData = new FormData(formRef.current);

    for (const [key, value] of formData.entries()) {
      (configs as any)[key] = value;
    }

    (configs as any).ignoreDirs = ignoreDirsRef.current.map((ref) => ref.value);
    console.log(configs);
  };

  const addIgDir = () => {
    setIgnoreDirs(
      // sync from the ref
      ignoreDirsRef.current.map((ref) => ref.value).concat("")
    );

    // clear, get the refs again when renderring again due to setIgnoreDirs
    ignoreDirsRef.current = [];
  };

  const deleteIgDir = (deleteIdx: number) => {
    // sync from the ref
    setIgnoreDirs(
      ignoreDirsRef.current
        .map((ref) => ref.value)
        .filter((_, idx) => idx !== deleteIdx)
    );

    // clear, get the refs again when renderring again due to setIgnoreDirs
    ignoreDirsRef.current = [];
  };

  return (
    <Modal
      showControl={setShow}
      confirmBtnText={"update"}
      confirmCallback={() => {
        updateConfigs();
      }}
    >
      <form className="config-form" ref={formRef}>
        <label className="config-label">Root path</label>
        <input
          className="config-input"
          type="text"
          name="docRootPath"
          placeholder="docRootPath"
        />
        <label className="config-label">
          Ignore dirs
          <span className="add-ignore-dir" onClick={() => addIgDir()}>
            +
          </span>
        </label>
        <div className="arr-config">
          {ignorDirs.map((dir, idx) => (
            <li key={dir + idx} className="arr-config-item">
              <input
                defaultValue={dir}
                className="config-input"
                type="text"
                ref={(ref) => ref && (ignoreDirsRef.current[idx] = ref)}
              />
              <span className="close-tag" onClick={() => deleteIgDir(idx)}>
                ×
              </span>
            </li>
          ))}
        </div>
        <label className="config-label">Region</label>
        <input
          className="config-input"
          type="text"
          name="region"
          placeholder="region for aliyun OSS"
        />
        <label className="config-label">AccessKeyId</label>
        <input
          className="config-input"
          type="text"
          name="accessKeyId"
          placeholder="accessKeyId for aliyun OSS"
        />
        <label className="config-label">AccessKeySecret</label>
        <input
          className="config-input"
          type="text"
          name="accessKeySecret"
          placeholder="accessKeySecret for aliyun OSS"
        />
        <label className="config-label">Bucket</label>
        <input
          className="config-input"
          type="text"
          name="bucket"
          placeholder="bucket for aliyun OSS"
        />
      </form>
    </Modal>
  );
}

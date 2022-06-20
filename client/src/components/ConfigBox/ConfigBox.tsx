import React, { useEffect, useRef, useState } from "react";
import {
  useGetConfigsQuery,
  useUpdateConfigsMutation,
  ConfigType,
} from "@/redux-api/configApi";
import Modal from "../Modal/Modal";

import "./ConfigBox.less";
import Toast from "@/utils/Toast";

export type ConfigBoxProps = {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ConfigBox({ setShow }: ConfigBoxProps) {
  const {
    data: { configs, err } = {
      configs: null,
      err: 1,
    },
    isSuccess,
  } = useGetConfigsQuery();

  const [ignorDirs, setIgnoreDirs] = useState<string[]>([]);
  const formRef = useRef(null);
  const ignoreDirsRef = useRef<HTMLInputElement[]>([]);

  const [updateConfigsMutation] = useUpdateConfigsMutation();

  const updateConfigs = async () => {
    if (!formRef.current) return;

    const configs = {};

    const formData = new FormData(formRef.current);

    for (const [key, value] of formData.entries()) {
      (configs as any)[key] = value;
    }

    (configs as any).ignoreDirs = [
      ...new Set(
        ignoreDirsRef.current
          .map((ref) => ref.value)
          .filter((dir) => dir.trim() !== "")
      ),
    ];

    try {
      const resp = await updateConfigsMutation(configs as ConfigType).unwrap();

      if (resp.err === 1) {
        Toast(resp.message, "ERROR", 2000);
      } else {
        Toast(resp.message, "SUCCESS");
      }
    } catch (err) {
      console.log(err);
      Toast(String(err), "ERROR", 10000);
    }
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

  useEffect(() => {
    if (!isSuccess || err === 1) return;

    configs && configs.ignoreDirs && setIgnoreDirs(configs.ignoreDirs);
  }, [configs, isSuccess, err]);

  return (
    <Modal
      showControl={setShow}
      confirmBtnText={"update"}
      confirmCallback={async (setLoading) => {
        setLoading(true);
        await updateConfigs();
        setLoading(false);
      }}
    >
      <form className="config-form" ref={formRef}>
        <label className="config-label">Root path</label>
        <input
          defaultValue={configs?.docRootPath}
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
          defaultValue={configs?.region ?? ""}
          className="config-input"
          type="text"
          name="region"
          placeholder="region for aliyun OSS"
        />
        <label className="config-label">AccessKeyId</label>
        <input
          defaultValue={configs?.accessKeyId ?? ""}
          className="config-input"
          type="text"
          name="accessKeyId"
          placeholder="accessKeyId for aliyun OSS"
        />
        <label className="config-label">AccessKeySecret</label>
        <input
          defaultValue={configs?.accessKeySecret ?? ""}
          className="config-input"
          type="text"
          name="accessKeySecret"
          placeholder="accessKeySecret for aliyun OSS"
        />
        <label className="config-label">Bucket</label>
        <input
          defaultValue={configs?.bucket ?? ""}
          className="config-input"
          type="text"
          name="bucket"
          placeholder="bucket for aliyun OSS"
        />
      </form>
    </Modal>
  );
}

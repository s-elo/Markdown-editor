import React, { useState } from "react";
import Modal from "../Modal/Modal";

export type ConfigBoxProps = {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ConfigBox({ show, setShow }: ConfigBoxProps) {
  return show ? (
    <Modal showControl={setShow}>this is config area</Modal>
  ) : (
    <></>
  );
}

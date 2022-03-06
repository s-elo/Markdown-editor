import React from "react";

type Props = {
  showMenu: boolean;
  xPos: number;
  yPos: number;
};

export default function OperationMenu({ showMenu, xPos, yPos }: Props) {
  // stop the menu propagating the click event
  const menuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <main
      className="operation-menu"
      onClick={menuClick}
      style={{ display: showMenu ? "flex" : "none", left: xPos, top: yPos }}
    >
        <section className="operations">create new file</section>
        <section className="operations">create new group</section>
        <section className="operations">delete</section>
    </main>
  );
}

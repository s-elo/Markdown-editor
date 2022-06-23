import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { useDispatch, Provider } from "react-redux";
import { updateScrolling } from "@/redux-feature/curDocSlice";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import ClipboardJS from "clipboard";
import Outline from "../Outline/Outline";
import store from "@/store";

import { throttle } from "@/utils/utils";
import { useEditorScrollToAnchor } from "@/utils/hooks/docHookds";
import Toast from "@/utils/Toast";

class MountedAddons {
  // remove all the events and unmounted doms of each addon
  removers: (() => void)[] = [];

  scrollHandler = (
    prevScroll: number,
    dispatch: ReturnType<typeof useDispatch>
  ) => {
    const milkdownDom = document.getElementsByClassName("milkdown")[0];

    // get the previous scroll top
    milkdownDom.scrollTop = prevScroll;

    // bind the event after the first rendering caused by the above operation...
    setTimeout(() => {
      const eventFn = throttle(() => {
        dispatch(updateScrolling({ scrollTop: milkdownDom.scrollTop }));
      }, 1000);

      milkdownDom.addEventListener("scroll", eventFn);

      this.removers.push(() =>
        milkdownDom.removeEventListener("scroll", eventFn)
      );
    }, 0);
  };

  blurHandler = (dispatch: ReturnType<typeof useDispatch>) => {
    const milkdownDom = document.getElementsByClassName("milkdown")[0];

    const enterFn = () => {
      dispatch(
        updateGlobalOpts({
          keys: ["isEditorBlur"],
          values: [false],
        })
      );
    };
    const leaveFn = () => {
      dispatch(
        updateGlobalOpts({
          keys: ["isEditorBlur"],
          values: [true],
        })
      );
    };

    milkdownDom.addEventListener("mouseenter", enterFn);
    milkdownDom.addEventListener("mouseleave", leaveFn);

    this.removers.push(() => {
      milkdownDom.removeEventListener("mouseenter", enterFn);
      milkdownDom.removeEventListener("mouseleave", leaveFn);
    });
  };

  anchorHandler = (
    anchor: string,
    dispatch: ReturnType<typeof useDispatch>,
    scrollToAnchor: ReturnType<typeof useEditorScrollToAnchor>
  ) => {
    scrollToAnchor(anchor);

    // clear the anchor to avoid reanchor when switch modes
    // the actual scrolling will be recorded in curglobal doc info above
    dispatch(updateGlobalOpts({ keys: ["anchor"], values: [""] }));
  };

  addHeadingAnchor = (curPath: string[]) => {
    // add outline on each heading
    const headingDoms = document.getElementsByClassName("heading");
    if (!headingDoms) return;

    for (const headingDom of headingDoms) {
      const div = document.createElement("div");
      div.classList.add("heading-outline");

      headingDom.appendChild(div);

      ReactDOM.render(
        <Provider store={store}>
          <BrowserRouter>
            <Outline
              containerDom={
                document.getElementsByClassName("milkdown")[0] as HTMLElement
              }
              path={curPath}
            />
          </BrowserRouter>
        </Provider>,
        div
      );
    }
  };

  keywordsHandler = (keywords: string[]) => {
    const domSet = new Set();
    // filter the repeated keyword doms
    const strongDoms = [...document.getElementsByClassName("strong")].filter(
      (dom) => !domSet.has(dom.innerHTML) && domSet.add(dom.innerHTML)
    );

    if (strongDoms && strongDoms.length !== 0) {
      let idx = 0;
      for (const strongDom of strongDoms) {
        strongDom.setAttribute(
          "id",
          keywords[idx].replace(/\s/g, "-").toLowerCase()
        );
        idx++;
      }
    }
  };

  addClipboard = () => {
    const codeFences = document.getElementsByClassName(
      "code-fence"
    ) as HTMLCollectionOf<HTMLElement>;

    const clipboards: ClipboardJS[] = [];

    for (const [idx, codeFence] of [...codeFences].entries()) {
      // get the code dom and add an id attribute
      const codeDom = codeFence.querySelector("code");
      codeDom?.setAttribute("id", `code-${idx}`);

      const copyBtn = document.createElement("button");
      copyBtn.classList.add("code-fence-copy-btn");
      copyBtn.innerText = `copy`;
      copyBtn.setAttribute("data-clipboard-target", `#code-${idx}`);

      codeFence.appendChild(copyBtn);

      const clipboard = new ClipboardJS(copyBtn);

      clipboard
        .on("success", (e) => {
          e.clearSelection();
          Toast("copied!", "SUCCESS");
        })
        .on("error", () => {
          Toast("failed to copy...", "ERROR");
        });

      clipboards.push(clipboard);
    }

    this.removers.push(() => {
      clipboards.forEach((c) => c.destroy());
    });
  };

  syncMirror = () => {
    const editorDom = document.querySelector(".editor");
    if (!editorDom) return;

    const blockDoms = editorDom.children;

    const blockLineNum = new Array(blockDoms.length).fill(0);
    let curTotalLine = 0;

    [...blockDoms].forEach((blockDom, idx) => {
      const lines = (blockDom as HTMLElement).innerText.split("\n");

      // record the start line number
      blockLineNum[idx] = curTotalLine;

      if (blockDom.querySelector("img")) {
        // specail case handling for img block
        curTotalLine--;
      }

      curTotalLine += lines.length + 1;
    });

    [...blockDoms].forEach((blockDom, idx) => {
      const dbClickEvent = () => {
        const mirrorDom = document.querySelector(".cm-content");
        const mirrorScroller = document.querySelector(".cm-scroller");
        if (!mirrorDom || !mirrorScroller) return;

        const lineDoms = mirrorDom.children;
        if (lineDoms.length === 0 || !lineDoms[idx]) return;

        const oneLineHeight = Number(
          getComputedStyle(lineDoms[0]).height.replace("px", "")
        );

        mirrorScroller.scroll({
          top: blockLineNum[idx] * oneLineHeight,
          behavior: "smooth",
        });
      };

      blockDom.addEventListener("dblclick", dbClickEvent);
      this.removers.push(() =>
        blockDom.removeEventListener("dblclick", dbClickEvent)
      );
    });
  };

  removeEvents = () => {
    this.removers.forEach((r) => r());
    this.removers = [];
  };
}

export default new MountedAddons();

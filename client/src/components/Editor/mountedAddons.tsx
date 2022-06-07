import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { useDispatch, Provider } from "react-redux";
import { updateScrolling } from "@/redux-feature/curDocSlice";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import Outline from "../Menu/Outline";
import store from "@/store";

import { throttle } from "@/utils/utils";

export const scrollHandler = (
  prevScroll: number,
  dispatch: ReturnType<typeof useDispatch>
) => {
  const milkdownDom = document.getElementsByClassName("milkdown")[0];

  // get the previous scroll top
  milkdownDom.scrollTop = prevScroll;

  // bind the event after the first rendering caused by the above operation...
  setTimeout(() => {
    milkdownDom.addEventListener(
      "scroll",
      throttle(() => {
        dispatch(updateScrolling({ scrollTop: milkdownDom.scrollTop }));
      }, 1000)
    );
  }, 0);
};

export const blurHandler = (dispatch: ReturnType<typeof useDispatch>) => {
  const milkdownDom = document.getElementsByClassName("milkdown")[0];

  milkdownDom.addEventListener("mouseenter", () => {
    dispatch(
      updateGlobalOpts({
        keys: ["isEditorBlur"],
        values: [false],
      })
    );
  });

  milkdownDom.addEventListener("mouseleave", () => {
    dispatch(
      updateGlobalOpts({
        keys: ["isEditorBlur"],
        values: [true],
      })
    );
  });
};

export const anchorHandler = (
  anchor: string,
  dispatch: ReturnType<typeof useDispatch>
) => {
  // go to the anchor
  const dom = document.getElementById(anchor);
  const parentDom = document.getElementsByClassName(
    "milkdown"
  )[0] as HTMLElement;

  if (dom) {
    parentDom.scroll({ top: dom.offsetTop, behavior: "smooth" });
  }

  // clear the anchor to avoid reanchor when switch modes
  // the actual scrolling will be recorded in curglobal doc info above
  dispatch(updateGlobalOpts({ keys: ["anchor"], values: [""] }));
};

export const addHeadingAnchor = (curPath: string[]) => {
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

export const keywordsHandler = (keywords: string[]) => {
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

export const addClipboard = () => {
  // const codeFences = document.getElementsByClassName("code-fence");
  // console.log(codeFences);
};

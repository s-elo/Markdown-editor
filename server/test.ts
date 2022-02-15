import { additDoc, modifyName } from "./docsOperaiton";
import path from "path";

const newContent = `# Header`;
// additDoc(path.resolve(__dirname, "./test/article/a3.md"), newContent);
modifyName(["sort", "sort"], "newTree", true);

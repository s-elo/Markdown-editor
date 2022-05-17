import path from "path";
import simpleGit, { SimpleGit } from "simple-git";
import { docRootPath } from "./Docer";
// const newContent = `# Header`;
// additDoc(path.resolve(__dirname, "./test/article/a3.md"), newContent);
// modifyName("sort/sort", "newTree", true);

const getGitStatus = async (git: SimpleGit) => {
  try {
    const { not_added, staged } = await git.status();

    const ret = await git.status();
    console.log(ret);

    if (not_added.length === 0 && staged.length === 0) return "COMMITTED";
    else if (not_added.length === 0) return "ADDED";
  } catch {
    return "NOTGIT";
  }
};

const gitTest = async (path: string) => {
  const git = simpleGit(path);
  console.log(await getGitStatus(git));

  //   const pullRet = await git.pull();
  //   console.log(pullRet);
  // const { tracking } = await git.status();
  // git.add("./*");
  // git.commit("just for test");
  // git.push(tracking?.split("/"));
  //   if ((await git.pull())?.summary.changes) {
  //     console.log()
  //   }
  //   const commands = ["status"];)
  //   const ret = await git.raw(commands);
  //   console.log(ret);
};

gitTest(docRootPath);

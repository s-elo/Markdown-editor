# GitHub Workspace

Browser-side Git workspace state manager. It keeps file changes in IndexedDB and publishes staged changes through the GitHub API.

## State model

The workspace keeps three trees containing the remote entries known so far plus all local changes:

```text
baseTree     Remote commit currently used as the base
stagedTree   Files included in the next publish
workingTree  Files and folders currently shown in the editor
```

Initial loading first requests the configured docs root recursively. A complete response marks every returned directory
as loaded. If GitHub truncates that response, initialization restarts with the docs root's direct children and nested
directories are loaded one level at a time. The menu and file operations use the same directory-loader API in both cases;
loading is simply a no-op for directories already present in a complete snapshot.

Directory Git tree SHAs and loaded state are persisted separately. An entry that has not been fetched is absent from all
three trees and therefore never appears as a deletion. Publishing uses GitHub's `base_tree`, so unloaded remote entries
remain unchanged.

Git status is derived from differences between these trees:

```ts
unstagedChanges = diffTrees(stagedTree, workingTree, 'UNTRACKED');
stagedChanges = diffTrees(baseTree, stagedTree, 'ADDED');
```

`workingTree` is therefore the final workspace. It already contains both staged and unstaged edits.

## Status and tree transformations

`diffTrees(from, to, addedStatus)` converts two trees into file changes:

- missing in `from`, present in `to` → `ADDED` or `UNTRACKED`
- present in both with different content or Git data → `MODIFIED`
- present in `from`, missing in `to` → `DELETED`
- identical in both → no change

Directories are ignored because Git tracks files, not directories.

`applyChangesToTree(baseTree, changes)` performs the reverse transformation. It clones the base, applies additions,
updates, and deletions, then rebuilds parent directories.

Persistence uses both directions:

```ts
// Save
stagedChanges = getStagedChanges(baseTree, stagedTree);
unstagedChanges = getUnstagedChanges(stagedTree, workingTree);

// Load
stagedTree = applyChangesToTree(baseTree, stagedChanges);
workingTree = applyChangesToTree(stagedTree, unstagedChanges);
```

## File operations

Operations mutate `workingTree`. Status is recalculated from the trees instead of being updated manually.

| Operation           | Tree change                       | Resulting unstaged status |
| ------------------- | --------------------------------- | ------------------------- |
| Create file         | Add to `workingTree`              | `UNTRACKED`               |
| Update tracked file | Replace its content               | `MODIFIED`                |
| Delete tracked file | Remove from `workingTree`         | `DELETED`                 |
| Move file           | Delete source and add destination | grouped delete and add    |
| Copy file           | Add destination                   | `UNTRACKED`               |
| Create empty folder | Store locally in IndexedDB        | no Git status             |

Each operation receives `operationMetadata`. Its `groupId` keeps related paths together, so a move or directory
operation can be staged, restored, or displayed as one action.

### Reconciliation examples

Create, update, then delete before staging:

```text
create note.md  → UNTRACKED
update note.md  → UNTRACKED
delete note.md  → no change (workingTree matches stagedTree again)
```

Stage a file, then edit it again:

```text
create note.md  → unstaged: UNTRACKED
stage note.md   → staged: ADDED
update note.md  → staged: ADDED, unstaged: MODIFIED
```

Stage a new file, then delete it:

```text
stagedTree  contains note.md → staged: ADDED
workingTree removes note.md  → unstaged: DELETED
```

Publishing creates the staged file first. The remaining unstaged deletion is then replayed onto the new base.

## Staging and publishing

- `stageChanges()` copies selected paths from `workingTree` to `stagedTree`.
- `unstageChanges()` copies selected paths from `baseTree` to `stagedTree`.
- `restoreWorkingChanges()` copies selected paths from `stagedTree` to `workingTree`.
- `getPublishEntries()` converts `baseTree → stagedTree` changes into GitHub tree entries.
- After publishing, the remote tree becomes both `baseTree` and `stagedTree`; remaining unstaged changes are replayed
  onto `workingTree`.

## Source map

- `src/index.ts` — public store and operation orchestration
- `src/workspace-operations.ts` — file, folder, staging, and restore mutations
- `src/git-status.ts` — tree diffing, change application, and publish entries
- `src/persistence.ts` — IndexedDB storage
- `src/types.ts` — public state and operation types

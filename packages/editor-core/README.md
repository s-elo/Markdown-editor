# @markdown-editor/core

Reusable Milkdown/Crepe editor with its provider, configuration, custom plugins, components, and styles included.

## Usage

```tsx
import { CrepeEditor, type CrepeEditorRef } from '@markdown-editor/core';

const editorRef = useRef<CrepeEditorRef>(null);

<CrepeEditor
  ref={editorRef}
  defaultValue="# Hello"
  onUpdated={(_, markdown) => console.log(markdown)}
  uploadImage={async (file) => uploadToYourBackend(file)}
/>;
```

`CrepeEditor` includes its own `MilkdownProvider` and can be rendered directly.

## Props

| Prop | Type | Default / purpose |
| --- | --- | --- |
| `defaultValue` | `string` | `''`; initial Markdown |
| `isDarkMode` | `boolean` | `false`; dark CodeMirror and Mermaid themes |
| `readonly` | `boolean` | `false`; disables editing |
| `initialScrollTop` | `number` | `0`; restored editor scroll position |
| `getScrollContainer` | `() => HTMLElement \| null` | Provides the editor scroll container |
| `getMirrorContainer` | `() => HTMLElement \| null` | Provides the source/mirror container for synchronization |
| `uploadImage` | `(file: File) => Promise<string>` | Uploads an image and returns its URL |
| `getImageUrl` | `(url: string) => string` | Resolves stored image URLs for display |
| `onMounted` | `(ctx: Ctx) => void` | Called after the editor mounts |
| `onUpdated` | `(ctx: Ctx, markdown: string) => void` | Called when Markdown changes |
| `onHeadingsChange` | `(headings: EditorHeading[]) => void` | Reports the current outline |
| `onScroll` | `(scrollTop: number) => void` | Reports editor scrolling |
| `onAnchorChange` | `(anchor: string) => void` | Reports the active heading anchor |
| `onToAnchor` | `(id: string) => void` | Called when a heading permalink is selected |
| `onBlurChange` | `(isBlurred: boolean) => void` | Reports whether the pointer is outside the editor |
| `onToast` | `(message: string) => void` | Handles link and code-copy notifications |

All props are optional. Image upload throws until `uploadImage` is supplied.

### Ref API

| Method | Purpose |
| --- | --- |
| `update(markdown)` | Replaces the editor content |
| `get()` | Returns the Milkdown `Editor`, if mounted |
| `reRender()` | Recreates the editor with the current props |

## Included features

- Crepe block menu, formatting toolbar, link tooltip, image blocks, and CodeMirror blocks.
- Mermaid code-block previews with light/dark themes.
- Image upload, paste/drop support, inline images, and custom URL resolution.
- Heading permalinks, outline reporting, active-anchor tracking, and scroll restoration.
- Colored highlights using `==text==` or `=={#color}text==`, with a color picker.
- Containers: `tip`, `info`, `warning`, `danger`, and collapsible `details`.
- Editable iframe blocks using `:iframe{src="https://example.com"}`.
- Readonly mode, editor/mirror synchronization, blur tracking, and search-result highlighting.

The package entry imports the Milkdown theme and feature styles. Hosts provide `react`, `react-dom`, and PrimeReact theme/icon styles. For explicit style ordering, import `@markdown-editor/core/styles.scss`.

Lower-level editor factories, plugins, components, configs, and helpers are also exported from the package entry point and feature subpaths.

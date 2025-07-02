import { useCallback, useState, useEffect, useRef } from 'react';
import RichTextEditor, { BaseKit } from 'reactjs-tiptap-editor';
import {
  BubbleMenuTwitter,
  BubbleMenuKatex,
  BubbleMenuExcalidraw,
  BubbleMenuMermaid,
  BubbleMenuDrawer
} from 'reactjs-tiptap-editor/bubble-extra';

// Import all extensions
import { Attachment } from 'reactjs-tiptap-editor/attachment';
import { Blockquote } from 'reactjs-tiptap-editor/blockquote';
import { Bold } from 'reactjs-tiptap-editor/bold';
import { BulletList } from 'reactjs-tiptap-editor/bulletlist';
import { Clear } from 'reactjs-tiptap-editor/clear';
import { Code } from 'reactjs-tiptap-editor/code';
import { CodeBlock } from 'reactjs-tiptap-editor/codeblock';
import { Color } from 'reactjs-tiptap-editor/color';
import { ColumnActionButton } from 'reactjs-tiptap-editor/multicolumn';
import { Emoji } from 'reactjs-tiptap-editor/emoji';
import { ExportPdf } from 'reactjs-tiptap-editor/exportpdf';
import { ExportWord } from 'reactjs-tiptap-editor/exportword';
import { FontFamily } from 'reactjs-tiptap-editor/fontfamily';
import { FontSize } from 'reactjs-tiptap-editor/fontsize';
import { FormatPainter } from 'reactjs-tiptap-editor/formatpainter';
import { Heading } from 'reactjs-tiptap-editor/heading';
import { History } from 'reactjs-tiptap-editor/history';
import { HorizontalRule } from 'reactjs-tiptap-editor/horizontalrule';
import { Iframe } from 'reactjs-tiptap-editor/iframe';
import { Image } from 'reactjs-tiptap-editor/image';
import { ImageGif } from 'reactjs-tiptap-editor/imagegif';
import { ImportWord } from 'reactjs-tiptap-editor/importword';
import { Indent } from 'reactjs-tiptap-editor/indent';
import { Italic } from 'reactjs-tiptap-editor/italic';
import { LineHeight } from 'reactjs-tiptap-editor/lineheight';
import { Link } from 'reactjs-tiptap-editor/link';
import { Mention } from 'reactjs-tiptap-editor/mention';
import { MoreMark } from 'reactjs-tiptap-editor/moremark';
import { OrderedList } from 'reactjs-tiptap-editor/orderedlist';
import { SearchAndReplace } from 'reactjs-tiptap-editor/searchandreplace';
import { SearchCommand } from '@/extensions/SearchCommand';
// Temporarily removing SlashCommand as it also uses suggestions and might conflict
// import { SlashCommand } from 'reactjs-tiptap-editor/slashcommand';
import { Strike } from 'reactjs-tiptap-editor/strike';
import { Table } from 'reactjs-tiptap-editor/table';
import { TableOfContents } from 'reactjs-tiptap-editor/tableofcontent';
import { TaskList } from 'reactjs-tiptap-editor/tasklist';
import { TextAlign } from 'reactjs-tiptap-editor/textalign';
import { TextUnderline } from 'reactjs-tiptap-editor/textunderline';
import { Video } from 'reactjs-tiptap-editor/video';
import { TextDirection } from 'reactjs-tiptap-editor/textdirection';
import { Katex } from 'reactjs-tiptap-editor/katex';
import { Drawer } from 'reactjs-tiptap-editor/drawer';
import { Excalidraw } from 'reactjs-tiptap-editor/excalidraw';
import { Twitter } from 'reactjs-tiptap-editor/twitter';
import { Mermaid } from 'reactjs-tiptap-editor/mermaid';
// Temporarily removing QPSCommand to isolate the conflict
// import { QPSCommand } from '@/extensions/QPSCommand';

// Import custom extensions
import { WikiLink } from '@/extensions/WikiLink';
import { Tag } from '@/extensions/Tag';
import { CrossLink } from '@/extensions/CrossLink';
import { Entity } from '@/extensions/Entity';
import { Triple } from '@/extensions/Triple';
import { NoteSyntax } from '@/extensions/NoteSyntax';
import { Connections } from '@/extensions/Connections';
import { NERHighlight } from '@/extensions/NERHighlight';
import { AIHighlight } from '@/extensions/AIHighlight';
import AIControlBar from '@/components/ai/AIControlBar';

// Import CSS
import 'reactjs-tiptap-editor/style.css';
import 'prism-code-editor-lightweight/layout.css';
import "prism-code-editor-lightweight/themes/github-dark.css";
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'react-image-crop/dist/ReactCrop.css';

import { useLayoutDimensions } from '@/hooks/useLayoutDimensions';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  isDarkMode?: boolean;
  noteId?: string;
  toolbarVisible?: boolean;
  onToolbarVisibilityChange?: (visible: boolean) => void;
}

function convertBase64ToBlob(base64: string) {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Extensions array - temporarily simplified to isolate suggestion plugin conflicts
const extensions = [
  BaseKit.configure({
    placeholder: {
      showOnlyCurrent: true,
    },
    characterCount: {
      limit: 50_000,
    },
  }),
  
  // Add custom schema extensions first
  Tag,
  CrossLink,
  WikiLink,
  Entity,
  Triple,
  
  // Add NER highlighting extension
  NERHighlight,
  
  // Add AI highlighting extension
  AIHighlight.configure({
    HTMLAttributes: {
      class: 'ai-highlight',
    },
  }),
  
  // Add input rules extension
  NoteSyntax,
  
  // Add connections extension for real-time parsing
  Connections,
  
  // Add only SearchCommand for now to isolate the issue
  SearchCommand,  // trigger: ??, shortcut: Mod-k
  
  History,
  SearchAndReplace,
  TableOfContents,
  FormatPainter.configure({ spacer: true }),
  Clear,
  FontFamily,
  Heading.configure({ spacer: true }),
  FontSize,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  MoreMark,
  Emoji,
  Color.configure({ spacer: true }),
  BulletList,
  OrderedList,
  TextAlign.configure({ types: ['heading', 'paragraph'], spacer: true }),
  Indent,
  LineHeight,
  TaskList.configure({
    spacer: true,
    taskItem: {
      nested: true,
    },
  }),
  Link,
  Image.configure({
    upload: (files: File) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(URL.createObjectURL(files));
        }, 500);
      });
    },
  }),
  Video.configure({
    upload: (files: File) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(URL.createObjectURL(files));
        }, 500);
      });
    },
  }),
  ImageGif.configure({
    GIPHY_API_KEY: import.meta.env.VITE_GIPHY_API_KEY || '',
  }),
  Blockquote,
  // Temporarily removing SlashCommand as it might conflict with SearchCommand
  // SlashCommand,
  HorizontalRule,
  Code.configure({
    toolbar: false,
  }),
  CodeBlock,
  ColumnActionButton,
  Table,
  Iframe,
  ExportPdf.configure({ spacer: true }),
  ImportWord.configure({
    upload: (files: File[]) => {
      const f = files.map(file => ({
        src: URL.createObjectURL(file),
        alt: file.name,
      }));
      return Promise.resolve(f);
    },
  }),
  ExportWord,
  TextDirection,
  Mention,
  Attachment.configure({
    upload: (file: any) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      return new Promise((resolve) => {
        setTimeout(() => {
          const blob = convertBase64ToBlob(reader.result as string);
          resolve(URL.createObjectURL(blob));
        }, 300);
      });
    },
  }),
  Katex,
  Excalidraw,
  Mermaid.configure({
    upload: (file: any) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      return new Promise((resolve) => {
        setTimeout(() => {
          const blob = convertBase64ToBlob(reader.result as string);
          resolve(URL.createObjectURL(blob));
        }, 300);
      });
    },
  }),
  Drawer.configure({
    upload: (file: any) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      return new Promise((resolve) => {
        setTimeout(() => {
          const blob = convertBase64ToBlob(reader.result as string);
          resolve(URL.createObjectURL(blob));
        }, 300);
      });
    },
  }),
  Twitter,
];

const RichEditor = ({ 
  content, 
  onChange, 
  isDarkMode = false, 
  noteId,
  toolbarVisible = true,
  onToolbarVisibilityChange
}: RichEditorProps) => {
  const [editorContent, setEditorContent] = useState(() => {
    try {
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      return content;
    }
  });
  
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const previousContentRef = useRef<string>('');

  const dimensions = useLayoutDimensions({ 
    includeToolbar: toolbarVisible,
    includeConnections: false // RichEditor doesn't need to account for connections panel
  });

  // Listen for keyboard shortcut (Ctrl+\) - use the localStorage-persisting handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        if (onToolbarVisibilityChange) {
          onToolbarVisibilityChange(!toolbarVisible);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toolbarVisible, onToolbarVisibilityChange]);

  // Force editor content update when content prop changes (note switching)
  useEffect(() => {
    if (!editorInstance) return;
    
    const newContent = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Only update if content actually changed to avoid infinite loops
    if (newContent !== previousContentRef.current) {
      try {
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Use editor's setContent method to properly update TipTap state
        editorInstance.commands.setContent(parsedContent, false, {
          preserveWhitespace: 'full'
        });
        
        setEditorContent(parsedContent);
        previousContentRef.current = newContent;
      } catch (error) {
        console.warn('Failed to parse content when switching notes:', error);
        // Fallback to setting raw content
        editorInstance.commands.setContent(content, false);
        setEditorContent(content);
        previousContentRef.current = newContent;
      }
    }
  }, [content, editorInstance]);

  const onValueChange = useCallback((value: any) => {
    const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Prevent update loops by checking if content actually changed
    if (jsonString !== previousContentRef.current) {
      setEditorContent(value);
      previousContentRef.current = jsonString;
      onChange(jsonString);
    }
  }, [onChange]);

  const onEditorCreate = useCallback((editor: any) => {
    setEditorInstance(editor);
    // Initialize previous content ref
    const initialContent = typeof content === 'string' ? content : JSON.stringify(content);
    previousContentRef.current = initialContent;
  }, [content]);

  // Calculate dynamic maxHeight based on toolbar visibility
  const maxHeight = toolbarVisible ? "calc(100vh - 200px)" : "calc(100vh - 140px)";

  return (
    <div className="h-full flex flex-col min-h-0 editor-themed theme-aware-editor">
      <RichTextEditor
        output="json"
        content={editorContent as any}
        onChangeContent={onValueChange}
        ref={(editorRef: any) => {
          if (editorRef?.editor && !editorInstance) {
            onEditorCreate(editorRef.editor);
          }
        }}
        extensions={extensions}
        dark={isDarkMode}
        minHeight="400px"
        maxHeight={dimensions.availableHeight}
        hideToolbar={!toolbarVisible}
        bubbleMenu={{
          render({ extensionsNames, editor, disabled }, bubbleDefaultDom) {
            return (
              <>
                {bubbleDefaultDom}
                {extensionsNames.includes('twitter') ? (
                  <BubbleMenuTwitter
                    disabled={disabled}
                    editor={editor}
                    key="twitter"
                  />
                ) : null}
                {extensionsNames.includes('katex') ? (
                  <BubbleMenuKatex
                    disabled={disabled}
                    editor={editor}
                    key="katex"
                  />
                ) : null}
                {extensionsNames.includes('excalidraw') ? (
                  <BubbleMenuExcalidraw
                    disabled={disabled}
                    editor={editor}
                    key="excalidraw"
                  />
                ) : null}
                {extensionsNames.includes('mermaid') ? (
                  <BubbleMenuMermaid
                    disabled={disabled}
                    editor={editor}
                    key="mermaid"
                  />
                ) : null}
                {extensionsNames.includes('drawer') ? (
                  <BubbleMenuDrawer
                    disabled={disabled}
                    editor={editor}
                    key="drawer"
                  />
                ) : null}
              </>
            );
          },
        }}
      />
      
      {/* Add AI Control Bar at the bottom */}
      {editorInstance && (
        <AIControlBar 
          editor={editorInstance} 
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default RichEditor;

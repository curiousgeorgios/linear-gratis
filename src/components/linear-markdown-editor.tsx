"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LinearMarkdownEditorProps = Omit<
  React.ComponentProps<"div">,
  "content" | "onChange" | "onBlur"
> & {
  value: string;
  content?: JSONContent | null;
  contentKey?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
};

type ToolbarState = {
  isParagraph: boolean;
  isHeading2: boolean;
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isTaskList: boolean;
  isBlockquote: boolean;
  isCodeBlock: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

type ToolbarButton = {
  label: string;
  icon: LucideIcon;
  active?: keyof ToolbarState;
  disabled?: keyof ToolbarState;
  action: (editor: Editor) => void;
};

const emptyToolbarState: ToolbarState = {
  isParagraph: false,
  isHeading2: false,
  isBold: false,
  isItalic: false,
  isStrike: false,
  isCode: false,
  isBulletList: false,
  isOrderedList: false,
  isTaskList: false,
  isBlockquote: false,
  isCodeBlock: false,
  canUndo: false,
  canRedo: false,
};

const toolbarGroups: ToolbarButton[][] = [
  [
    {
      label: "Paragraph",
      icon: Pilcrow,
      active: "isParagraph",
      action: (editor) => editor.chain().focus().setParagraph().run(),
    },
    {
      label: "Heading",
      icon: Heading2,
      active: "isHeading2",
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ],
  [
    {
      label: "Bold",
      icon: Bold,
      active: "isBold",
      action: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: "isItalic",
      action: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: "isStrike",
      action: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Code",
      icon: Code,
      active: "isCode",
      action: (editor) => editor.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      label: "Bullet list",
      icon: List,
      active: "isBulletList",
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: "isOrderedList",
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Checklist",
      icon: ListChecks,
      active: "isTaskList",
      action: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
  ],
  [
    {
      label: "Quote",
      icon: Quote,
      active: "isBlockquote",
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: Code2,
      active: "isCodeBlock",
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
  ],
  [
    {
      label: "Undo",
      icon: Undo2,
      disabled: "canUndo",
      action: (editor) => editor.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      icon: Redo2,
      disabled: "canRedo",
      action: (editor) => editor.chain().focus().redo().run(),
    },
  ],
];

export function LinearMarkdownEditor({
  value,
  content,
  contentKey,
  onChange,
  onBlur,
  className,
  name,
  placeholder = "Write a description...",
  disabled = false,
  ...rootProps
}: LinearMarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const lastMarkdownRef = useRef(value);
  const lastContentKeyRef = useRef(contentKey);
  const isApplyingExternalValueRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        indentation: {
          style: "space",
          size: 2,
        },
      }),
    ],
    [placeholder],
  );

  const editor = useEditor(
    {
      extensions,
      content: content || value || "",
      ...(content ? {} : { contentType: "markdown" as const }),
      editable: !disabled,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "linear-rich-editor-content",
          "aria-multiline": "true",
        },
        handleDOMEvents: {
          blur: () => {
            onBlurRef.current?.();
            return false;
          },
        },
      },
      onUpdate: ({ editor }) => {
        if (isApplyingExternalValueRef.current) return;

        const markdown = editor.getMarkdown();
        lastMarkdownRef.current = markdown;
        lastContentKeyRef.current = contentKey;
        onChangeRef.current(markdown);
      },
    },
    [extensions],
  );

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return emptyToolbarState;

      return {
        isParagraph: editor.isActive("paragraph"),
        isHeading2: editor.isActive("heading", { level: 2 }),
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isStrike: editor.isActive("strike"),
        isCode: editor.isActive("code"),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isTaskList: editor.isActive("taskList"),
        isBlockquote: editor.isActive("blockquote"),
        isCodeBlock: editor.isActive("codeBlock"),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      };
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (
      value === lastMarkdownRef.current &&
      contentKey === lastContentKeyRef.current
    ) {
      return;
    }

    isApplyingExternalValueRef.current = true;
    if (content) {
      editor.commands.setContent(content, { emitUpdate: false });
    } else {
      editor.commands.setContent(value || "", {
        contentType: "markdown",
        emitUpdate: false,
      });
    }
    lastMarkdownRef.current = value;
    lastContentKeyRef.current = contentKey;
    isApplyingExternalValueRef.current = false;
  }, [content, contentKey, editor, value]);

  return (
    <div
      {...rootProps}
      className={cn(
        "linear-rich-editor overflow-hidden rounded-md border border-input bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        disabled && "opacity-70",
        className,
      )}
      onClick={(event) => {
        rootProps.onClick?.(event);
        if (event.defaultPrevented) return;
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.closest("button,input,a")) return;
        editor?.chain().focus().run();
      }}
    >
      <div className="z-10 flex flex-wrap items-center gap-1 border-b border-border bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        {toolbarGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={cn(
              "flex items-center gap-0.5",
              groupIndex > 0 && "border-l border-border pl-1.5",
            )}
          >
            {group.map((item) => {
              const Icon = item.icon;
              const isActive = item.active ? toolbarState?.[item.active] : false;
              const isDisabled =
                disabled ||
                !editor ||
                (item.disabled ? !toolbarState?.[item.disabled] : false);

              return (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={item.active ? Boolean(isActive) : undefined}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!editor) return;
                    item.action(editor);
                  }}
                  className={cn(
                    "size-8 rounded text-muted-foreground hover:text-foreground",
                    isActive && "bg-accent text-foreground shadow-xs",
                  )}
                >
                  <Icon className="size-4" />
                </Button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="max-h-[min(56vh,560px)] overflow-y-auto overscroll-contain">
        <EditorContent editor={editor} />
      </div>
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
    </div>
  );
}

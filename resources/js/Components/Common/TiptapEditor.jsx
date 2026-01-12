import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';

const TiptapEditor = ({ value, onChange, placeholder = "Design description..." }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // Totally disable headings
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="tiptap-wrapper border rounded-lg overflow-hidden bg-white">
            <div className="tiptap-toolbar bg-light p-2 border-bottom d-flex flex-wrap gap-1 align-items-center">

                {/* BOLD */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`btn btn-sm ${editor.isActive('bold') ? 'btn-dark' : 'btn-outline-secondary'}`}
                    title="Bold"
                >
                    <b>Bold</b>
                </button>

                {/* ITALIC */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`btn btn-sm ${editor.isActive('italic') ? 'btn-dark' : 'btn-outline-secondary'}`}
                    title="Italic"
                >
                    <i>Italic</i>
                </button>
            </div>

            <div className="tiptap-editor-field p-3">
                <EditorContent editor={editor} />
            </div>

            <style>{`
                /* KILL ALL BLUE HIGHLIGHTS */
                .tiptap-wrapper {
                    border: 1px solid #dee2e6 !important;
                    transition: none !important;
                    box-shadow: none !important;
                }

                /* No blue border or glow on focus */
                .tiptap-wrapper:focus-within {
                    border-color: #ced4da !important;
                    box-shadow: none !important;
                    outline: none !important;
                }

                .tiptap-toolbar .btn {
                    border: 1px solid #dee2e6 !important;
                    font-weight: 500;
                    background: white !important;
                    color: #495057 !important;
                    border-radius: 4px;
                    padding: 4px 12px;
                    transition: none !important;
                }

                /* ACTIVE STATE - Dark neutral */
                .tiptap-toolbar .btn-dark, 
                .tiptap-toolbar .btn.btn-dark {
                    background-color: #343a40 !important;
                    border-color: #343a40 !important;
                    color: white !important;
                }

                /* HOVER - Subtle gray, NO BLUE */
                .tiptap-toolbar .btn:hover {
                    background-color: #f8f9fa !important;
                    border-color: #adb5bd !important;
                    color: #212529 !important;
                    box-shadow: none !important;
                    outline: none !important;
                }

                .tiptap-editor-field {
                    background: white !important;
                    max-height: 210mm;
                    overflow-y: auto;
                }

                .ProseMirror {
                    min-height: 150px;
                    max-height: 100%;
                    outline: none !important;
                    color: #2d3436;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    background: white !important;
                }

                /* This might be causing the blue block in your image */
                .ProseMirror:focus {
                    background: white !important;
                    outline: none !important;
                    box-shadow: none !important;
                }

                /* Neutral text selection */
                .ProseMirror ::selection {
                    background: #e9ecef !important;
                    color: inherit !important;
                }

                /* Placeholder styling */
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                    font-style: italic;
                }

                /* Ensure icons are NOT shown by disabling styles that might bring them back */
                [class^="ti-"], [class*=" ti-"] {
                    display: none !important;
                }
                .tiptap-toolbar [class^="ti-"], .tiptap-toolbar [class*=" ti-"] {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};

export default TiptapEditor;

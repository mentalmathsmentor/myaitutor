import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CodeVerifier from './CodeVerifier';
import GraphViewer from './GraphViewer';

const MessageBubble = ({ role, content }) => {
    const isUser = role === 'user';

    const preprocessLaTeX = (text) => {
        if (!text) return text;
        return text
            .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
            .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    };

    const contentComponents = useMemo(() => {
        if (isUser) return [{ type: 'text', content }];

        const components = [];
        const rawText = preprocessLaTeX(content);

        const parts = rawText.split(/(```[\w-]*\n[\s\S]*?```)/g);

        parts.forEach((part, index) => {
            if (!part.trim()) return;

            if (part.startsWith('```')) {
                const match = part.match(/```([\w-]*)\n([\s\S]*?)```/);
                if (match) {
                    const lang = match[1];
                    const code = match[2];

                    if (lang === 'json-graph') {
                        try {
                            const data = JSON.parse(code);
                            components.push({ type: 'graph', data });
                        } catch (e) {
                            components.push({ type: 'text', content: `[Graph Error: ${e.message}]` });
                        }
                    } else if (lang === 'python') {
                        components.push({ type: 'code-verify', code: code.trim(), output: null, id: index });
                    } else if (lang === 'output') {
                        const prevComp = components[components.length - 1];
                        if (prevComp && prevComp.type === 'code-verify') {
                            prevComp.output = code.trim();
                        } else {
                            components.push({ type: 'text', content: part });
                        }
                    } else {
                        components.push({ type: 'text', content: part });
                    }
                } else {
                    components.push({ type: 'text', content: part });
                }
            } else {
                components.push({ type: 'text', content: part });
            }
        });

        return components;
    }, [content, isUser]);

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-reveal`}>
            <div className={`relative max-w-[85%] sm:max-w-[80%] ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                <div
                    className={`
                        px-4 py-3
                        text-[15px] leading-relaxed
                        ${isUser
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-br-sm shadow-glow-sm'
                            : 'bg-surface-2 border border-surface-3 text-foreground rounded-2xl rounded-bl-sm'
                        }
                    `}
                >
                    <div className="space-y-3">
                        {isUser ? (
                            <div className="whitespace-pre-wrap">{content}</div>
                        ) : (
                            contentComponents.map((comp, idx) => {
                                if (comp.type === 'graph') {
                                    return (
                                        <div key={idx} className="my-3">
                                            <GraphViewer data={comp.data} />
                                        </div>
                                    );
                                }
                                if (comp.type === 'code-verify') {
                                    return (
                                        <div key={idx} className="my-3">
                                            <CodeVerifier code={comp.code} output={comp.output} />
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        key={idx}
                                        className="chat-prose prose prose-invert prose-sm max-w-none
                                            [&>p]:mb-2 [&>p:last-child]:mb-0
                                            [&>ul]:my-2 [&>ol]:my-2
                                            [&_strong]:text-primary [&_strong]:font-semibold
                                            [&_code]:bg-surface-1 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary [&_code]:font-mono [&_code]:text-sm
                                            [&_.katex]:text-foreground"
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {comp.content}
                                        </ReactMarkdown>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;

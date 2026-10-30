import { createElement, CSSProperties, ReactNode } from 'react';
import { content, ruled as ruledCls } from './content.module.css';

type ContentProps = {
  type: string;
  ruled?: boolean;
  style?: CSSProperties;
  children: ReactNode;
};

export default function Content({ type, ruled = false, style, children }: ContentProps) {
  return (
    createElement(type, { className: `${content}${ruled ? ` ${ruledCls}` : ''} container`, style }, children)
  )
};

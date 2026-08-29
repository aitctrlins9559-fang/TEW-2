import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 全局自動滾動：當行動裝置軟體鍵盤跳出時，自動將被焦點選取的輸入框平滑滾動至螢幕中央，避免被鍵盤遮擋
if (typeof window !== 'undefined') {
  window.addEventListener(
    'focusin',
    (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        // 延遲 250ms 等待手機虛擬鍵盤推起動畫完成後，將輸入框置中顯示
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 250);
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

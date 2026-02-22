import React from 'react';
import { Provider } from 'some-provider';
import './globals.css'; // Tailwind CSS import

export const metadata = {
  title: 'My App',
  description: 'A description of my app',
};

const Layout = ({ children }) => {
  return (
    <Provider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </Provider>
  );
};

export default Layout;
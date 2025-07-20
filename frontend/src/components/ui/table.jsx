import React from 'react';

const Table = ({ children, className = '', ...props }) => (
  <div className="w-full overflow-auto">
    <table className={`w-full text-sm text-left ${className}`} {...props}>
      {children}
    </table>
  </div>
);

const TableHeader = ({ children, className = '', ...props }) => (
  <thead className={`text-xs uppercase bg-gray-50 ${className}`} {...props}>
    {children}
  </thead>
);

const TableBody = ({ children, className = '', ...props }) => (
  <tbody className={`divide-y divide-gray-200 ${className}`} {...props}>
    {children}
  </tbody>
);

const TableRow = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-gray-50 ${className}`} {...props}>
    {children}
  </tr>
);

const TableHead = ({ children, className = '', ...props }) => (
  <th className={`px-6 py-3 font-medium text-gray-900 ${className}`} {...props}>
    {children}
  </th>
);

const TableCell = ({ children, className = '', ...props }) => (
  <td className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </td>
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }; 
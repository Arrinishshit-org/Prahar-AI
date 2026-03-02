import React from 'react';

const categories = [
  'Education',
  'Healthcare',
  'Agriculture',
  'Employment',
  'Housing',
  'Social Welfare',
  'Financial Assistance',
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <h3>Categories</h3>
      <ul className="category-list">
        {categories.map(category => (
          <li key={category}>
            <a href={`/schemes?category=${category}`}>{category}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
};

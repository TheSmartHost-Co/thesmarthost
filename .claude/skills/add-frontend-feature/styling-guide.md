# Styling Guide

> **Tailwind CSS patterns and conventions used in TheSmartHost**

---

## General Principles

1. **Always use Tailwind utility classes** - No CSS modules, no styled-components
2. **Use design system values** - Stick to Tailwind's spacing scale (1, 2, 3, 4, 6, 8, etc.)
3. **Prefer composition** - Combine utilities instead of custom CSS
4. **Mobile-first** - Default styles are mobile, add responsive modifiers

---

## Color Palette

### Text Colors
```tsx
<p className="text-black">      {/* Primary text */}
<p className="text-gray-900">   {/* Dark text */}
<p className="text-gray-700">   {/* Secondary text */}
<p className="text-gray-500">   {/* Muted text */}
<p className="text-white">      {/* White text */}
```

### Background Colors
```tsx
<div className="bg-white">         {/* White background */}
<div className="bg-gray-50">       {/* Light gray background */}
<div className="bg-gray-100">      {/* Subtle background */}
<div className="bg-blue-600">      {/* Primary action */}
<div className="bg-red-600">       {/* Destructive action */}
<div className="bg-green-100">     {/* Success badge */}
```

### Border Colors
```tsx
<div className="border border-gray-300">  {/* Default border */}
<div className="border-gray-200">         {/* Subtle border */}
<div className="divide-gray-200">         {/* Table dividers */}
```

---

## Layout

### Flexbox
```tsx
{/* Horizontal layout */}
<div className="flex items-center justify-between">
<div className="flex gap-3">
<div className="flex justify-end">

{/* Vertical layout */}
<div className="flex flex-col">
<div className="flex flex-col gap-4">
```

### Grid
```tsx
{/* Two columns */}
<div className="grid grid-cols-2 gap-4">

{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

{/* Auto-fit grid */}
<div className="grid grid-cols-[auto_1fr_auto] gap-4">
```

### Spacing
```tsx
{/* Padding */}
<div className="p-4">      {/* All sides: 1rem */}
<div className="p-6">      {/* All sides: 1.5rem */}
<div className="px-3 py-2"> {/* Horizontal 0.75rem, Vertical 0.5rem */}

{/* Margin */}
<div className="mt-4 mb-2">  {/* Top 1rem, Bottom 0.5rem */}
<div className="mx-auto">    {/* Center horizontally */}

{/* Gap (for flex/grid) */}
<div className="gap-3">
<div className="space-y-4">  {/* Vertical spacing between children */}
```

---

## Typography

### Headings
```tsx
<h1 className="text-2xl font-bold">        {/* Page title */}
<h2 className="text-xl mb-4 text-black">   {/* Modal title */}
<h3 className="text-lg font-semibold">     {/* Section title */}
```

### Body Text
```tsx
<p className="text-sm text-gray-700">      {/* Body text */}
<p className="text-xs text-gray-500">      {/* Helper text */}
<span className="font-medium">             {/* Emphasized text */}
<strong>Important</strong>                 {/* Bold text */}
```

### Labels
```tsx
<label className="block text-sm font-medium mb-1">
  Field Name *
</label>
```

---

## Interactive Elements

### Buttons

**Primary Button:**
```tsx
<button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
  Create
</button>
```

**Secondary Button (Cancel):**
```tsx
<button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
  Cancel
</button>
```

**Destructive Button (Delete):**
```tsx
<button className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
  Delete
</button>
```

**Disabled Button:**
```tsx
<button
  disabled={loading}
  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {loading ? 'Saving...' : 'Save'}
</button>
```

### Inputs

**Text Input:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Enter value..."
/>
```

**Select Dropdown:**
```tsx
<select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option>Option 1</option>
</select>
```

**Textarea:**
```tsx
<textarea
  rows={4}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

---

## Cards & Containers

### White Card
```tsx
<div className="bg-white rounded-lg shadow p-6">
  {/* Content */}
</div>
```

### Modal Container
```tsx
<div className="p-6 max-w-2xl w-11/12">
  {/* Modal content */}
</div>
```

### Table Container
```tsx
<div className="bg-white rounded-lg shadow overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    {/* Table content */}
  </table>
</div>
```

---

## Tables

### Table Structure
```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
        Name
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    <tr>
      <td className="px-6 py-4 text-sm text-gray-900">
        Value
      </td>
    </tr>
  </tbody>
</table>
```

### Status Badges
```tsx
{/* Active badge */}
<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
  Active
</span>

{/* Inactive badge */}
<span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
  Inactive
</span>

{/* Pending badge */}
<span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
  Pending
</span>
```

---

## Modal Patterns

### Modal Backdrop + Container
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

  {/* Modal content */}
  <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-11/12">
    {/* Content */}
  </div>
</div>
```

---

## Responsive Design

### Breakpoints
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px

### Common Patterns
```tsx
{/* Responsive width */}
<div className="w-full md:w-1/2 lg:w-1/3">

{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

{/* Hide on mobile */}
<div className="hidden md:block">

{/* Show only on mobile */}
<div className="block md:hidden">

{/* Responsive padding */}
<div className="p-4 md:p-6 lg:p-8">
```

---

## Loading States

### Loading Text
```tsx
<div className="p-8">Loading...</div>
```

### Loading Input
```tsx
<div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
  Loading clients...
</div>
```

### Empty State
```tsx
<div className="text-center py-8 text-gray-500">
  No resources found. Create your first resource to get started.
</div>
```

---

## Transitions

**Always add `transition-colors` to interactive elements:**
```tsx
<button className="... hover:bg-blue-700 transition-colors">
<input className="... focus:ring-2 focus:ring-blue-500 transition-colors">
```

---

## Z-Index Layers

```tsx
z-0     {/* Default layer */}
z-10    {/* Elevated content */}
z-20    {/* Dropdowns */}
z-30    {/* Sticky headers */}
z-40    {/* Overlays */}
z-50    {/* Modals */}
```

---

**Last Updated:** November 4, 2025

import React from "react";
import { cn } from "../utils/cn";
import { useTheme } from "../contexts/ThemeContext";

const CategoryBadge = ({
  category,
  size = "md",
  variant = "solid",
  className = "",
}) => {
  const { isDarkMode } = useTheme();

  // Fallback colors if category object doesn't have color
  const categoryColors = {
    tech: {
      solid: "bg-[#3A7DFF] text-white",
      outline:
        "border-[#3A7DFF] text-[#3A7DFF] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#3A7DFF]",
      text: "text-[#3A7DFF]",
    },
    business: {
      solid: "bg-[#16A34A] text-white",
      outline:
        "border-[#16A34A] text-[#16A34A] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#16A34A]",
      text: "text-[#16A34A]",
    },
    creative: {
      solid: "bg-[#8A4FFF] text-white",
      outline:
        "border-[#8A4FFF] text-[#8A4FFF] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#8A4FFF]",
      text: "text-[#8A4FFF]",
    },
    social: {
      solid: "bg-[#F59E0B] text-white",
      outline:
        "border-[#F59E0B] text-[#F59E0B] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#F59E0B]",
      text: "text-[#F59E0B]",
    },
    education: {
      solid: "bg-[#00D4FF] text-white",
      outline:
        "border-[#00D4FF] text-[#00D4FF] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#00D4FF]",
      text: "text-[#00D4FF]",
    },
    entertainment: {
      solid: "bg-[#EF4444] text-white",
      outline:
        "border-[#EF4444] text-[#EF4444] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#EF4444]",
      text: "text-[#EF4444]",
    },
    sports: {
      solid: "bg-[#3A7DFF] text-white",
      outline:
        "border-[#3A7DFF] text-[#3A7DFF] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#3A7DFF]",
      text: "text-[#3A7DFF]",
    },
    food: {
      solid: "bg-[#F59E0B] text-white",
      outline:
        "border-[#F59E0B] text-[#F59E0B] bg-[#F2F4F7] dark:bg-gray-800 dark:text-[#F59E0B]",
      text: "text-[#F59E0B]",
    },
  };

  const sizeConfig = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  // Handle category object or string
  let categoryName = category;
  let categoryColor = null;

  if (typeof category === "object" && category !== null) {
    categoryName = category.name || category.slug || "tech";
    categoryColor = category.color;
  } else {
    categoryName = category || "tech";
  }

  // Use category color from backend if available, otherwise use fallback
  let colorClass;

  if (categoryColor && variant === "solid") {
    // Use the actual color from the database
    const bgColor = isDarkMode
      ? `bg-[${categoryColor}]/80 text-white`
      : `bg-[${categoryColor}] text-white`;
    colorClass = bgColor;
  } else if (categoryColor && variant === "outline") {
    const borderColor = `border-[${categoryColor}] text-[${categoryColor}]`;
    const bgColor = isDarkMode ? "bg-gray-800" : "bg-[#F2F4F7]";
    colorClass = `${borderColor} ${bgColor}`;
  } else {
    // Fallback to predefined colors
    const colors =
      categoryColors[categoryName.toLowerCase()] || categoryColors.tech;
    colorClass = colors[variant];
  }

  // Display name from category object or the string itself
  const displayName =
    typeof category === "object" && category !== null
      ? category.name || category.slug || categoryName
      : categoryName;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        colorClass,
        sizeConfig[size],
        className
      )}
      style={
        categoryColor && variant === "solid"
          ? {
              backgroundColor: categoryColor,
              borderColor: categoryColor,
            }
          : categoryColor && variant === "outline"
          ? {
              borderColor: categoryColor,
              color: categoryColor,
            }
          : {}
      }
    >
      {displayName}
    </span>
  );
};

export default CategoryBadge;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TemplateSelector({ value, onChange }) {
  const templates = [
    {
      id: "classic",
      name: "Classic Template",
      description: "Professional and traditional invoice layout",
      preview: "📄 Classic Style",
    },
    {
      id: "modern",
      name: "Modern Template",
      description: "Contemporary and colorful design",
      preview: "🎨 Modern Style",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-3">
          Select Invoice Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              onClick={() => onChange(template.id)}
              className={`p-4 cursor-pointer transition-all border-2 ${
                value === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="text-3xl mb-3">{template.preview}</div>
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              {value === template.id && (
                <div className="mt-3">
                  <span className="text-xs font-bold bg-primary text-white px-2 py-1 rounded">
                    Selected
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
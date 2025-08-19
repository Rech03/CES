import { useState } from "react";

export default function MCQQuestionForm() {
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => setOptions([...options, ""]);
  const handleChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <form className="space-y-3">
      <input type="text" placeholder="Enter Question" className="w-full p-2 border rounded" />
      
      <p className="font-medium">Options:</p>
      {options.map((opt, i) => (
        <input
          key={i}
          type="text"
          placeholder={`Option ${i + 1}`}
          value={opt}
          onChange={(e) => handleChange(i, e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
      ))}

      <button type="button" onClick={addOption} className="px-3 py-1 bg-blue-500 text-white rounded">
        Add Option
      </button>

      <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
        Save Question
      </button>
    </form>
  );
}

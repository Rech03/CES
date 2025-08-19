
export default function TrueFalseQuestionForm() {
  return (
    <form className="space-y-3">
      <input type="text" placeholder="Enter Question" className="w-full p-2 border rounded" />

      <select className="w-full p-2 border rounded">
        <option value="">Select Answer</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>

      <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
        Save Question
      </button>
    </form>
  );
}

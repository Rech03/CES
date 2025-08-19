
export default function OpenEndedQuestionForm() {
  return (
    <form className="space-y-3">
      <input type="text" placeholder="Enter Question" className="w-full p-2 border rounded" />

      <textarea
        placeholder="Expected Answer (Optional)"
        className="w-full p-2 border rounded"
      ></textarea>

      <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
        Save Question
      </button>
    </form>
  );
}

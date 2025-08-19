
export default function OneWordQuestionForm() {
  return (
    <form className="space-y-3">
      <input type="text" placeholder="Enter Question" className="w-full p-2 border rounded" />

      <input
        type="text"
        placeholder="Correct One Word Answer"
        className="w-full p-2 border rounded"
      />

      <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
        Save Question
      </button>
    </form>
  );
}

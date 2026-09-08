// Trigga en filnedladdning i webbläsaren från en Blob. Endast klient (använder
// document/URL). Extraherad ur OperatorView för återbruk (export av ProjectDoc m.m.).
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

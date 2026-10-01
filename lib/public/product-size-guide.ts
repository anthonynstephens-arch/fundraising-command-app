export type ProductSizeGuide = {
  title: string;
  columns: string[];
  rows: string[][];
  notes: string[];
};

// Only extract our marked size table. Render every value as React text, never
// inject catalog HTML into the storefront.
function text(value: string) {
  return value.replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ({
      "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
    })[entity] || entity).replace(/\s+/g, " ").trim();
}

export function getProductSizeGuide(html: string): ProductSizeGuide | undefined {
  const section = html.match(/<!-- fc-size-guide:start -->([\s\S]*?)<!-- fc-size-guide:end -->/)?.[1];
  if (!section) return;
  const table = section.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) return;
  const rows = Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (row) =>
    Array.from(row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi), (cell) => text(cell[1])),
  );
  const columns = rows.shift();
  if (!columns?.length || !rows.length || rows.some((row) => row.length !== columns.length)) return;
  return {
    title: text(table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] || "Size guide"),
    columns,
    rows,
    notes: Array.from(section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi), (note) => text(note[1])),
  };
}

export function productDescriptionWithoutSizeGuide(description: string, guide?: ProductSizeGuide) {
  return guide ? description.split(guide.title)[0].trim() : description;
}

export const allow = (e: React.DragEvent<any>) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
};

export const files = (e: React.DragEvent<any>): File[] => {
  if (e.preventDefault) {
    e.preventDefault();
  }
  return Array.from(e.dataTransfer.items).map(item => item.getAsFile() as File);
};

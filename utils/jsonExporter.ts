export const exportToJson = (data: any, fileName: string = 'export.json') => {
    if (!data) {
        console.warn("No data available to export.");
        return;
    }

    const jsonContent = JSON.stringify(data, null, 2); // Pretty print JSON
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
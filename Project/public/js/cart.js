function validateForm() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one item to remove");
        return false; // Prevent form submission
    }
    return true; // Allow form submission
}
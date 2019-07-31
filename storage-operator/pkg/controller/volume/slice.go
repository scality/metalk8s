package volume

// Some basic slice helpers that are lacking from Go stdlib…
//
// Note that we only defines the helpers for `[]string` because:
// - we only need it for `[]string` for now
// - Go doesn't support generics anyway…

// Remove all the occurrences `target` from `slice` (if present).
//
// Arguments
//     slice:  the slice to process
//     target: the value to remove
//
// Returns
//     A slice without `target`.
func SliceRemoveValue(slice []string, target string) []string {
	newSlice := slice[:0]
	for _, value := range slice {
		if value != target {
			newSlice = append(newSlice, value)
		}
	}
	return newSlice
}

// Append `value` to `slice (if not already present).
//
// Arguments
//     slice:  the slice to process
//     target: the value to add.
//
// Returns
//     A slice with `target` in it.
func SliceAppendUnique(slice []string, newValue string) []string {
	for _, value := range slice {
		// value already present: nothing to do.
		if value == newValue {
			return slice
		}
	}
	return append(slice, newValue)
}

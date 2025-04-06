"""
Utility functions for the human review system.
These functions help with common tasks like comparing AI and human assessments.
"""

import json
from typing import Dict, Any, Optional


def build_assessment_comparison(
    ai_assessment: Dict[str, Any],
    human_assessment: Optional[Dict[str, Any]]
) -> Dict[str, Dict[str, Any]]:
    """
    Build a comparison between AI and human assessments.
    Identifies fields that were changed by the human reviewer.
    
    Args:
        ai_assessment: The original AI-generated assessment
        human_assessment: The human-modified assessment, or None if not modified
        
    Returns:
        A dictionary mapping field names to dictionaries containing AI values,
        human values, and whether they were changed
    """
    # If no human assessment, nothing was changed
    if not human_assessment:
        return {}
    
    comparison = {}
    
    # Function to process nested dictionaries recursively
    def process_dict(ai_dict, human_dict, prefix=""):
        for key, ai_value in ai_dict.items():
            if key not in human_dict:
                continue
                
            human_value = human_dict[key]
            field_name = f"{prefix}{key}" if prefix else key
            
            # For nested dictionaries, recurse
            if isinstance(ai_value, dict) and isinstance(human_value, dict):
                process_dict(ai_value, human_value, f"{field_name}.")
            else:
                # For simple values or different types, compare directly
                changed = not _values_equal(ai_value, human_value)
                
                # Format values for display
                ai_display = _format_value_for_display(ai_value)
                human_display = _format_value_for_display(human_value)
                
                comparison[field_name] = {
                    "ai_value": ai_display,
                    "human_value": human_display,
                    "changed": changed
                }
    
    process_dict(ai_assessment, human_assessment)
    return comparison


def _values_equal(val1: Any, val2: Any) -> bool:
    """
    Check if two values are equal, with special handling for lists.
    
    Args:
        val1: First value
        val2: Second value
        
    Returns:
        True if the values are equal, False otherwise
    """
    if isinstance(val1, list) and isinstance(val2, list):
        if len(val1) != len(val2):
            return False
        
        # For lists of dictionaries, compare each item
        if len(val1) > 0 and isinstance(val1[0], dict):
            return all(_dicts_equal(d1, d2) for d1, d2 in zip(sorted(val1, key=_dict_sort_key), sorted(val2, key=_dict_sort_key)))
        
        # For simple lists, compare sets (order insensitive)
        return set(map(str, val1)) == set(map(str, val2))
    
    # For simple values, compare directly
    return val1 == val2


def _dicts_equal(d1: Dict[str, Any], d2: Dict[str, Any]) -> bool:
    """
    Check if two dictionaries are equal, comparing their items.
    
    Args:
        d1: First dictionary
        d2: Second dictionary
        
    Returns:
        True if the dictionaries are equal, False otherwise
    """
    if set(d1.keys()) != set(d2.keys()):
        return False
    
    return all(_values_equal(d1[k], d2[k]) for k in d1.keys())


def _dict_sort_key(d: Dict[str, Any]) -> str:
    """
    Create a sort key for a dictionary.
    
    Args:
        d: Dictionary to sort
        
    Returns:
        String sort key
    """
    # Sort by first value, or empty string if dict is empty
    if not d:
        return ""
    
    # Get the first value as a string
    first_val = next(iter(d.values()))
    return str(first_val)


def _format_value_for_display(value: Any) -> str:
    """
    Format a value for display in a UI.
    
    Args:
        value: Value to format
        
    Returns:
        Formatted string
    """
    if value is None:
        return "None"
    
    if isinstance(value, (int, float, str, bool)):
        return str(value)
    
    if isinstance(value, list):
        if not value:
            return "[]"
        
        if isinstance(value[0], dict):
            return f"[{len(value)} items]"
        
        if len(value) > 3:
            items = ", ".join(str(v) for v in value[:3])
            return f"[{items}, ... + {len(value) - 3} more]"
        
        return f"[{', '.join(str(v) for v in value)}]"
    
    if isinstance(value, dict):
        return f"{{...}} ({len(value)} keys)"
    
    return str(value)
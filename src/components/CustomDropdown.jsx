import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import "./CustomDropdown.css";

const CustomDropdown = ({ label, value, onChange, options, disabled = false, searchable = true, forceDown = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [openUpward, setOpenUpward] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(option =>
            option.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Detect if dropdown would go off-screen and flip it upward
            if (dropdownRef.current) {
                const rect = dropdownRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                // Flip up if less than 260px below but enough space above
                setOpenUpward(!forceDown && spaceBelow < 260 && spaceAbove > spaceBelow);
            }
            // Focus input when dropdown opens
            if (searchable && inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, searchable]);

    const handleToggle = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled) return;

        if (!isOpen) {
            setIsOpen(true);
            setSearchQuery('');
        }
    }, [disabled, isOpen]);

    const handleSelect = useCallback((option, e) => {
        e.preventDefault();
        e.stopPropagation();

        onChange(option);
        setIsOpen(false);
        setSearchQuery('');
    }, [onChange]);

    const handleInputChange = (e) => {
        e.stopPropagation();
        setSearchQuery(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchQuery('');
        } else if (e.key === 'Enter' && filteredOptions.length === 1) {
            // Auto-select if only one option matches
            onChange(filteredOptions[0]);
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    return (
        <div className="custom-dropdown-container" ref={dropdownRef}>
            {label && <label className="custom-dropdown-label">{label}</label>}
            <div className="custom-dropdown-wrapper">
                {/* Trigger / Search Input */}
                <div
                    className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
                    onClick={handleToggle}
                >
                    {isOpen && searchable ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="dropdown-inline-search"
                            placeholder="Type to filter..."
                            value={searchQuery}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="dropdown-value">{value}</span>
                    )}
                    <svg
                        className={`custom-dropdown-chevron ${isOpen ? 'open' : ''}`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>

                {/* Dropdown Menu */}
                {isOpen && !disabled && (
                    <div className={`custom-dropdown-menu${openUpward ? ' upward' : ''}`} onClick={(e) => e.stopPropagation()}>
                        <div className="custom-dropdown-options">
                            {filteredOptions.length === 0 ? (
                                <div className="custom-dropdown-no-results">
                                    No matches found for "{searchQuery}"
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <div
                                        key={option}
                                        className={`custom-dropdown-item ${value === option ? 'selected' : ''}`}
                                        onClick={(e) => handleSelect(option, e)}
                                    >
                                        <span>{option}</span>
                                        {value === option && (
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="custom-dropdown-check"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomDropdown;

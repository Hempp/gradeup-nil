/* ═══════════════════════════════════════════════════════════════════════════
   GRADEUP NIL - Shared DOM Helper Utilities
   Consolidates common DOM creation patterns used across dashboards
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    /**
     * Create a form input group with label
     * @param {Object} options - Configuration object
     * @param {string} options.id - Input ID
     * @param {string} options.label - Label text
     * @param {string} options.type - Input type (text, email, number, password, date)
     * @param {string} options.placeholder - Placeholder text
     * @param {boolean} options.required - Whether field is required
     * @param {string} options.value - Initial value
     * @returns {HTMLElement} Form group element
     */
    window.createFormGroup = function(options) {
        const opts = options || {};
        const id = opts.id || 'input-' + Date.now();
        const labelText = opts.label || '';
        const type = opts.type || 'text';
        const placeholder = opts.placeholder || '';
        const required = opts.required || false;
        const value = opts.value || '';

        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = labelText;
        group.appendChild(label);

        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id;
        input.className = 'form-input';
        input.placeholder = placeholder;
        input.setAttribute('aria-label', labelText);
        if (required) input.required = true;
        if (value) input.value = value;

        group.appendChild(input);

        return group;
    };

    /**
     * Create a select dropdown with label
     * @param {Object} options - Configuration object
     * @param {string} options.id - Select ID
     * @param {string} options.label - Label text
     * @param {Array} options.options - Array of {value, label} objects
     * @param {boolean} options.required - Whether field is required
     * @param {string} options.value - Initial selected value
     * @returns {HTMLElement} Form group element
     */
    window.createSelectGroup = function(options) {
        const opts = options || {};
        const id = opts.id || 'select-' + Date.now();
        const labelText = opts.label || '';
        const selectOptions = opts.options || [];
        const required = opts.required || false;
        const value = opts.value || '';

        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = labelText;
        group.appendChild(label);

        const select = document.createElement('select');
        select.id = id;
        select.name = id;
        select.className = 'form-select';
        select.setAttribute('aria-label', labelText);
        if (required) select.required = true;

        selectOptions.forEach(function(opt) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === value) option.selected = true;
            select.appendChild(option);
        });

        group.appendChild(select);

        return group;
    };

    /**
     * Create a textarea with label
     * @param {Object} options - Configuration object
     * @param {string} options.id - Textarea ID
     * @param {string} options.label - Label text
     * @param {string} options.placeholder - Placeholder text
     * @param {boolean} options.required - Whether field is required
     * @param {number} options.rows - Number of rows
     * @returns {HTMLElement} Form group element
     */
    window.createTextareaGroup = function(options) {
        const opts = options || {};
        const id = opts.id || 'textarea-' + Date.now();
        const labelText = opts.label || '';
        const placeholder = opts.placeholder || '';
        const required = opts.required || false;
        const rows = opts.rows || 4;

        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = labelText;
        group.appendChild(label);

        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.name = id;
        textarea.className = 'form-textarea';
        textarea.placeholder = placeholder;
        textarea.rows = rows;
        textarea.setAttribute('aria-label', labelText);
        if (required) textarea.required = true;

        group.appendChild(textarea);

        return group;
    };

    /**
     * Create a button element
     * @param {Object} options - Configuration object
     * @param {string} options.text - Button text
     * @param {string} options.type - Button type (button, submit)
     * @param {string} options.variant - Style variant (primary, secondary, outline, ghost, danger, success)
     * @param {string} options.size - Size (sm, lg)
     * @param {boolean} options.block - Full width button
     * @param {Function} options.onClick - Click handler
     * @returns {HTMLElement} Button element
     */
    window.createButton = function(options) {
        const opts = options || {};
        const text = opts.text || 'Button';
        const type = opts.type || 'button';
        const variant = opts.variant || 'primary';
        const size = opts.size || '';
        const block = opts.block || false;
        const onClick = opts.onClick || null;

        const btn = document.createElement('button');
        btn.type = type;
        btn.className = 'btn btn-' + variant;
        if (size) btn.className += ' btn-' + size;
        if (block) btn.className += ' btn-block';
        btn.textContent = text;

        if (onClick) {
            btn.addEventListener('click', onClick);
        }

        return btn;
    };

    /**
     * Create a modal with header, body, and optional footer
     * @param {Object} options - Configuration object
     * @param {string} options.title - Modal title
     * @param {HTMLElement|string} options.content - Modal body content
     * @param {boolean} options.showFooter - Show footer with close button
     * @param {Function} options.onClose - Close callback
     * @returns {Object} { backdrop, modal, close }
     */
    window.createModal = function(options) {
        const opts = options || {};
        const title = opts.title || 'Modal';
        const content = opts.content || '';
        const showFooter = opts.showFooter !== false;
        const onClose = opts.onClose || null;

        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        // Modal container
        const modal = document.createElement('div');
        modal.className = 'modal-container';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';

        const titleEl = document.createElement('h3');
        titleEl.className = 'modal-title';
        titleEl.textContent = title;
        header.appendChild(titleEl);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.textContent = '✕';
        header.appendChild(closeBtn);

        modal.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof content === 'string') {
            body.textContent = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        modal.appendChild(body);

        // Footer (optional)
        if (showFooter) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';

            const closeFooterBtn = createButton({
                text: 'Close',
                variant: 'secondary'
            });
            footer.appendChild(closeFooterBtn);

            modal.appendChild(footer);

            closeFooterBtn.addEventListener('click', close);
        }

        backdrop.appendChild(modal);

        // Close function
        function close() {
            if (backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
            if (onClose) onClose();
        }

        // Close handlers
        closeBtn.addEventListener('click', close);
        backdrop.addEventListener('click', function(e) {
            if (e.target === backdrop) close();
        });

        // ESC key to close
        function handleEsc(e) {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', handleEsc);
            }
        }
        document.addEventListener('keydown', handleEsc);

        return {
            backdrop: backdrop,
            modal: modal,
            body: body,
            close: close,
            show: function() {
                document.body.appendChild(backdrop);
            }
        };
    };

    /**
     * Create a card component
     * @param {Object} options - Configuration object
     * @param {string} options.title - Card title
     * @param {string} options.actionText - Action button text
     * @param {Function} options.onAction - Action button click handler
     * @param {HTMLElement|string} options.content - Card body content
     * @returns {HTMLElement} Card element
     */
    window.createCard = function(options) {
        const opts = options || {};
        const title = opts.title || '';
        const actionText = opts.actionText || '';
        const onAction = opts.onAction || null;
        const content = opts.content || '';

        const card = document.createElement('div');
        card.className = 'glass-card';

        if (title || actionText) {
            const header = document.createElement('div');
            header.className = 'card-header';

            if (title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'card-title';
                titleEl.textContent = title;
                header.appendChild(titleEl);
            }

            if (actionText) {
                const actionBtn = document.createElement('button');
                actionBtn.className = 'card-action';
                actionBtn.textContent = actionText;
                if (onAction) {
                    actionBtn.addEventListener('click', onAction);
                }
                header.appendChild(actionBtn);
            }

            card.appendChild(header);
        }

        const body = document.createElement('div');
        body.className = 'card-body';
        if (typeof content === 'string') {
            body.textContent = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        card.appendChild(body);

        return card;
    };

    /**
     * Create a status badge
     * @param {string} status - Status type (pending, active, verified, completed, declined, flagged)
     * @param {string} text - Badge text (defaults to status)
     * @returns {HTMLElement} Badge element
     */
    window.createStatusBadge = function(status, text) {
        const badge = document.createElement('span');
        badge.className = 'status-badge ' + (status || 'pending');
        badge.textContent = text || status || 'pending';
        return badge;
    };

    /**
     * Create a loading skeleton
     * @param {Object} options - Configuration object
     * @param {string} options.width - Width (e.g., '100px', '100%')
     * @param {string} options.height - Height (e.g., '20px')
     * @param {string} options.borderRadius - Border radius (e.g., '4px', '50%')
     * @returns {HTMLElement} Skeleton element
     */
    window.createSkeleton = function(options) {
        const opts = options || {};
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton';
        skeleton.style.width = opts.width || '100%';
        skeleton.style.height = opts.height || '20px';
        skeleton.style.borderRadius = opts.borderRadius || '4px';
        skeleton.style.background = 'linear-gradient(90deg, var(--gray-800) 25%, var(--gray-700) 50%, var(--gray-800) 75%)';
        skeleton.style.backgroundSize = '200% 100%';
        skeleton.style.animation = 'shimmer 1.5s infinite';
        return skeleton;
    };

    /**
     * Show a custom alert modal (replacement for browser alert())
     * @param {string} message - Alert message
     * @param {Function} callback - Optional callback after OK is clicked
     * @param {Object} options - Optional configuration
     * @param {string} options.title - Modal title (default: 'Notice')
     * @param {string} options.buttonText - OK button text (default: 'OK')
     */
    window.showAlert = function(message, callback, options) {
        const opts = options || {};
        const title = opts.title || 'Notice';
        const buttonText = opts.buttonText || 'OK';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay custom-alert-overlay active';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'alertTitle');
        overlay.setAttribute('aria-describedby', 'alertMessage');

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog custom-alert-dialog';

        const titleEl = document.createElement('h3');
        titleEl.id = 'alertTitle';
        titleEl.className = 'modal-title';
        titleEl.textContent = title;

        const messageEl = document.createElement('p');
        messageEl.id = 'alertMessage';
        messageEl.className = 'modal-message';
        messageEl.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const okBtn = document.createElement('button');
        okBtn.className = 'btn btn-primary';
        okBtn.textContent = buttonText;
        okBtn.addEventListener('click', function() {
            overlay.classList.remove('active');
            setTimeout(function() {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                if (callback && typeof callback === 'function') {
                    callback();
                }
            }, 300);
        });

        actions.appendChild(okBtn);
        dialog.appendChild(titleEl);
        dialog.appendChild(messageEl);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Focus the OK button for accessibility
        setTimeout(function() {
            okBtn.focus();
        }, 50);

        // Handle Escape key
        function handleEsc(e) {
            if (e.key === 'Escape') {
                okBtn.click();
                document.removeEventListener('keydown', handleEsc);
            }
        }
        document.addEventListener('keydown', handleEsc);

        // Handle click outside
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                okBtn.click();
            }
        });
    };

    /**
     * Show a custom confirm modal (replacement for browser confirm())
     * @param {string} message - Confirm message
     * @param {Function} onConfirm - Callback when confirmed (Yes clicked)
     * @param {Function} onCancel - Optional callback when cancelled (No clicked)
     * @param {Object} options - Optional configuration
     * @param {string} options.title - Modal title (default: 'Confirm')
     * @param {string} options.confirmText - Confirm button text (default: 'Yes')
     * @param {string} options.cancelText - Cancel button text (default: 'No')
     * @param {boolean} options.danger - Use danger styling for confirm button
     */
    window.showConfirm = function(message, onConfirm, onCancel, options) {
        const opts = options || {};
        const title = opts.title || 'Confirm';
        const confirmText = opts.confirmText || 'Yes';
        const cancelText = opts.cancelText || 'No';
        const danger = opts.danger || false;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay custom-alert-overlay active';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'confirmTitle');
        overlay.setAttribute('aria-describedby', 'confirmMessage');

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog custom-alert-dialog';

        const titleEl = document.createElement('h3');
        titleEl.id = 'confirmTitle';
        titleEl.className = 'modal-title';
        titleEl.textContent = title;

        const messageEl = document.createElement('p');
        messageEl.id = 'confirmMessage';
        messageEl.className = 'modal-message';
        messageEl.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = cancelText;

        const confirmBtn = document.createElement('button');
        confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
        confirmBtn.textContent = confirmText;

        function closeOverlay() {
            overlay.classList.remove('active');
            setTimeout(function() {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }

        cancelBtn.addEventListener('click', function() {
            closeOverlay();
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
        });

        confirmBtn.addEventListener('click', function() {
            closeOverlay();
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        dialog.appendChild(titleEl);
        dialog.appendChild(messageEl);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Focus the cancel button for accessibility (safer default)
        setTimeout(function() {
            cancelBtn.focus();
        }, 50);

        // Handle Escape key (cancel)
        function handleEsc(e) {
            if (e.key === 'Escape') {
                cancelBtn.click();
                document.removeEventListener('keydown', handleEsc);
            }
        }
        document.addEventListener('keydown', handleEsc);

        // Handle click outside (cancel)
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                cancelBtn.click();
            }
        });
    };

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Type (success, error, warning, info)
     * @param {number} duration - Duration in ms (default 3000)
     */
    window.showToast = function(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;

        // Remove existing toast
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification toast-' + type;
        toast.style.cssText = 'position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px); padding: 1rem 2rem; border-radius: 8px; font-weight: 600; opacity: 0; transition: all 0.3s ease; z-index: 10000;';

        const colors = {
            success: 'background: var(--success); color: white;',
            error: 'background: var(--error); color: white;',
            warning: 'background: var(--warning); color: black;',
            info: 'background: var(--cyan); color: black;'
        };
        toast.style.cssText += colors[type] || colors.info;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(function() {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // Animate out
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, duration);
    };

})();

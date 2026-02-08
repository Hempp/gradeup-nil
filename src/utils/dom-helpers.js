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
        var opts = options || {};
        var id = opts.id || 'input-' + Date.now();
        var labelText = opts.label || '';
        var type = opts.type || 'text';
        var placeholder = opts.placeholder || '';
        var required = opts.required || false;
        var value = opts.value || '';

        var group = document.createElement('div');
        group.className = 'form-group';

        var label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = labelText;
        group.appendChild(label);

        var input = document.createElement('input');
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
        var opts = options || {};
        var id = opts.id || 'select-' + Date.now();
        var labelText = opts.label || '';
        var selectOptions = opts.options || [];
        var required = opts.required || false;
        var value = opts.value || '';

        var group = document.createElement('div');
        group.className = 'form-group';

        var label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = labelText;
        group.appendChild(label);

        var select = document.createElement('select');
        select.id = id;
        select.name = id;
        select.className = 'form-select';
        select.setAttribute('aria-label', labelText);
        if (required) select.required = true;

        selectOptions.forEach(function(opt) {
            var option = document.createElement('option');
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
        var opts = options || {};
        var id = opts.id || 'textarea-' + Date.now();
        var labelText = opts.label || '';
        var placeholder = opts.placeholder || '';
        var required = opts.required || false;
        var rows = opts.rows || 4;

        var group = document.createElement('div');
        group.className = 'form-group';

        var label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = labelText;
        group.appendChild(label);

        var textarea = document.createElement('textarea');
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
        var opts = options || {};
        var text = opts.text || 'Button';
        var type = opts.type || 'button';
        var variant = opts.variant || 'primary';
        var size = opts.size || '';
        var block = opts.block || false;
        var onClick = opts.onClick || null;

        var btn = document.createElement('button');
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
        var opts = options || {};
        var title = opts.title || 'Modal';
        var content = opts.content || '';
        var showFooter = opts.showFooter !== false;
        var onClose = opts.onClose || null;

        // Backdrop
        var backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        // Modal container
        var modal = document.createElement('div');
        modal.className = 'modal-container';

        // Header
        var header = document.createElement('div');
        header.className = 'modal-header';

        var titleEl = document.createElement('h3');
        titleEl.className = 'modal-title';
        titleEl.textContent = title;
        header.appendChild(titleEl);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.textContent = '✕';
        header.appendChild(closeBtn);

        modal.appendChild(header);

        // Body
        var body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof content === 'string') {
            body.textContent = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        modal.appendChild(body);

        // Footer (optional)
        if (showFooter) {
            var footer = document.createElement('div');
            footer.className = 'modal-footer';

            var closeFooterBtn = createButton({
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
        var opts = options || {};
        var title = opts.title || '';
        var actionText = opts.actionText || '';
        var onAction = opts.onAction || null;
        var content = opts.content || '';

        var card = document.createElement('div');
        card.className = 'glass-card';

        if (title || actionText) {
            var header = document.createElement('div');
            header.className = 'card-header';

            if (title) {
                var titleEl = document.createElement('h3');
                titleEl.className = 'card-title';
                titleEl.textContent = title;
                header.appendChild(titleEl);
            }

            if (actionText) {
                var actionBtn = document.createElement('button');
                actionBtn.className = 'card-action';
                actionBtn.textContent = actionText;
                if (onAction) {
                    actionBtn.addEventListener('click', onAction);
                }
                header.appendChild(actionBtn);
            }

            card.appendChild(header);
        }

        var body = document.createElement('div');
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
        var badge = document.createElement('span');
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
        var opts = options || {};
        var skeleton = document.createElement('div');
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
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Type (success, error, warning, info)
     * @param {number} duration - Duration in ms (default 3000)
     */
    window.showToast = function(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;

        // Remove existing toast
        var existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast-notification toast-' + type;
        toast.style.cssText = 'position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px); padding: 1rem 2rem; border-radius: 8px; font-weight: 600; opacity: 0; transition: all 0.3s ease; z-index: 10000;';

        var colors = {
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

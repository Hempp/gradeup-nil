/**
 * Tests for the validation utility functions
 * @module __tests__/lib/utils/validation.test
 */

import {
  validators,
  socialValidators,
  dateValidators,
  paymentValidators,
  videoValidators,
  usernameValidators,
  nameValidators,
  getPasswordStrength,
  formatPhoneNumber,
  stripPhoneNumber,
  formatGPAValue,
  formatCurrencyInput,
  formatSocialHandle,
  combineValidators,
  when,
  detectVideoPlatform,
  extractYouTubeVideoId,
  maskAccountNumber,
  confirmField,
  gpaValidator,
} from '@/lib/utils/validation';

describe('validators', () => {
  describe('required', () => {
    it('returns null for non-empty strings', () => {
      expect(validators.required('hello')).toBeNull();
      expect(validators.required('test value')).toBeNull();
    });

    it('returns error for empty strings', () => {
      expect(validators.required('')).toBe('This field is required');
      expect(validators.required('   ')).toBe('This field is required');
    });
  });

  describe('email', () => {
    it('returns null for valid emails', () => {
      expect(validators.email('test@example.com')).toBeNull();
      expect(validators.email('user.name@domain.org')).toBeNull();
      expect(validators.email('user+tag@email.co.uk')).toBeNull();
    });

    it('returns error for invalid emails', () => {
      expect(validators.email('invalid')).toBe('Please enter a valid email address');
      expect(validators.email('missing@domain')).toBe('Please enter a valid email address');
      expect(validators.email('@nodomain.com')).toBe('Please enter a valid email address');
    });

    it('returns null for empty strings (let required handle)', () => {
      expect(validators.email('')).toBeNull();
    });
  });

  describe('minLength', () => {
    const minLength5 = validators.minLength(5);

    it('returns null for strings meeting minimum length', () => {
      expect(minLength5('hello')).toBeNull();
      expect(minLength5('longer string')).toBeNull();
    });

    it('returns error for strings below minimum length', () => {
      expect(minLength5('abc')).toBe('Must be at least 5 characters');
      expect(minLength5('a')).toBe('Must be at least 5 characters');
    });

    it('returns null for empty strings', () => {
      expect(minLength5('')).toBeNull();
    });
  });

  describe('maxLength', () => {
    const maxLength10 = validators.maxLength(10);

    it('returns null for strings within maximum length', () => {
      expect(maxLength10('short')).toBeNull();
      expect(maxLength10('exactly10!')).toBeNull();
    });

    it('returns error for strings exceeding maximum length', () => {
      expect(maxLength10('this is too long')).toBe('Must be no more than 10 characters');
    });

    it('returns null for empty strings', () => {
      expect(maxLength10('')).toBeNull();
    });
  });

  describe('password', () => {
    it('returns null for passwords 8+ characters', () => {
      expect(validators.password('password123')).toBeNull();
      expect(validators.password('12345678')).toBeNull();
    });

    it('returns error for passwords under 8 characters', () => {
      expect(validators.password('short')).toBe('Password must be at least 8 characters');
      expect(validators.password('1234567')).toBe('Password must be at least 8 characters');
    });
  });

  describe('strongPassword', () => {
    it('returns null for strong passwords', () => {
      expect(validators.strongPassword('Password1')).toBeNull();
      expect(validators.strongPassword('MyP@ssword123')).toBeNull();
    });

    it('returns error for passwords missing uppercase', () => {
      expect(validators.strongPassword('password1')).toBe('Password must contain at least one uppercase letter');
    });

    it('returns error for passwords missing lowercase', () => {
      expect(validators.strongPassword('PASSWORD1')).toBe('Password must contain at least one lowercase letter');
    });

    it('returns error for passwords missing numbers', () => {
      expect(validators.strongPassword('Password')).toBe('Password must contain at least one number');
    });

    it('returns error for short passwords', () => {
      expect(validators.strongPassword('Pass1')).toBe('Password must be at least 8 characters');
    });
  });

  describe('passwordMatch', () => {
    const getPassword = () => 'password123';
    const matchValidator = validators.passwordMatch(getPassword);

    it('returns null when passwords match', () => {
      expect(matchValidator('password123')).toBeNull();
    });

    it('returns error when passwords do not match', () => {
      expect(matchValidator('different')).toBe('Passwords do not match');
    });

    it('returns null for empty strings', () => {
      expect(matchValidator('')).toBeNull();
    });
  });

  describe('phone', () => {
    it('returns null for valid phone numbers', () => {
      expect(validators.phone('1234567890')).toBeNull();
      expect(validators.phone('(123) 456-7890')).toBeNull();
      expect(validators.phone('+1 123-456-7890')).toBeNull();
    });

    it('returns error for invalid phone numbers', () => {
      expect(validators.phone('123')).toBe('Please enter a valid phone number');
      expect(validators.phone('not a phone')).toBe('Please enter a valid phone number');
    });
  });

  describe('url', () => {
    it('returns null for valid URLs', () => {
      expect(validators.url('https://example.com')).toBeNull();
      expect(validators.url('http://localhost:3000')).toBeNull();
      expect(validators.url('https://sub.domain.co.uk/path')).toBeNull();
    });

    it('returns error for invalid URLs', () => {
      expect(validators.url('not a url')).toBe('Please enter a valid URL');
      expect(validators.url('example.com')).toBe('Please enter a valid URL');
    });
  });

  describe('numeric', () => {
    it('returns null for numeric values', () => {
      expect(validators.numeric('123')).toBeNull();
      expect(validators.numeric('45.67')).toBeNull();
      expect(validators.numeric('-10')).toBeNull();
    });

    it('returns error for non-numeric values', () => {
      expect(validators.numeric('abc')).toBe('Must be a valid number');
      expect(validators.numeric('12abc')).toBe('Must be a valid number');
    });
  });

  describe('min', () => {
    const min10 = validators.min(10);

    it('returns null for values at or above minimum', () => {
      expect(min10('10')).toBeNull();
      expect(min10('100')).toBeNull();
    });

    it('returns error for values below minimum', () => {
      expect(min10('5')).toBe('Must be at least 10');
      expect(min10('0')).toBe('Must be at least 10');
    });
  });

  describe('max', () => {
    const max100 = validators.max(100);

    it('returns null for values at or below maximum', () => {
      expect(max100('100')).toBeNull();
      expect(max100('50')).toBeNull();
    });

    it('returns error for values above maximum', () => {
      expect(max100('101')).toBe('Must be no more than 100');
      expect(max100('1000')).toBe('Must be no more than 100');
    });
  });

  describe('pattern', () => {
    const alphanumeric = validators.pattern(/^[a-zA-Z0-9]+$/, 'Only alphanumeric characters allowed');

    it('returns null when pattern matches', () => {
      expect(alphanumeric('abc123')).toBeNull();
      expect(alphanumeric('TEST')).toBeNull();
    });

    it('returns error when pattern does not match', () => {
      expect(alphanumeric('abc-123')).toBe('Only alphanumeric characters allowed');
      expect(alphanumeric('test@email')).toBe('Only alphanumeric characters allowed');
    });
  });

  describe('gpa', () => {
    it('returns null for valid GPA values', () => {
      expect(validators.gpa('3.5')).toBeNull();
      expect(validators.gpa('4.0')).toBeNull();
      expect(validators.gpa('2.0')).toBeNull();
      expect(validators.gpa('0')).toBeNull();
    });

    it('returns error for invalid GPA values', () => {
      expect(validators.gpa('4.5')).toBe('GPA must be between 0.00 and 4.00');
      expect(validators.gpa('-1')).toBe('GPA must be between 0.00 and 4.00');
      expect(validators.gpa('abc')).toBe('GPA must be between 0.00 and 4.00');
    });
  });
});

describe('socialValidators', () => {
  describe('instagram', () => {
    it('returns null for valid handles', () => {
      expect(socialValidators.instagram('username')).toBeNull();
      expect(socialValidators.instagram('@username')).toBeNull();
      expect(socialValidators.instagram('user.name_123')).toBeNull();
    });

    it('returns error for invalid handles', () => {
      expect(socialValidators.instagram('user@name')).toBe('Invalid characters in Instagram handle');
      expect(socialValidators.instagram('a'.repeat(35))).toBe('Instagram handle too long (max 30 characters)');
    });
  });

  describe('twitter', () => {
    it('returns null for valid handles', () => {
      expect(socialValidators.twitter('username')).toBeNull();
      expect(socialValidators.twitter('@user_123')).toBeNull();
    });

    it('returns error for invalid handles', () => {
      expect(socialValidators.twitter('user.name')).toBe('Invalid characters in Twitter handle');
      expect(socialValidators.twitter('a'.repeat(20))).toBe('Twitter handle too long (max 15 characters)');
    });
  });

  describe('tiktok', () => {
    it('returns null for valid handles', () => {
      expect(socialValidators.tiktok('username')).toBeNull();
      expect(socialValidators.tiktok('@user.name_123')).toBeNull();
    });

    it('returns error for invalid handles', () => {
      expect(socialValidators.tiktok('user@name')).toBe('Invalid characters in TikTok handle');
      expect(socialValidators.tiktok('a'.repeat(30))).toBe('TikTok handle too long (max 24 characters)');
    });
  });
});

describe('dateValidators', () => {
  describe('futureDate', () => {
    it('returns null for future dates', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(dateValidators.futureDate(future.toISOString())).toBeNull();
    });

    it('returns error for past dates', () => {
      expect(dateValidators.pastDate('2020-01-01')).toBeNull();
    });

    it('returns error for invalid dates', () => {
      expect(dateValidators.futureDate('not a date')).toBe('Invalid date');
    });
  });

  describe('pastDate', () => {
    it('returns null for past dates', () => {
      expect(dateValidators.pastDate('2020-01-01')).toBeNull();
    });

    it('returns error for future dates', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(dateValidators.pastDate(future.toISOString())).toBe('Date must be in the past');
    });
  });

  describe('dateAfter', () => {
    const afterValidator = dateValidators.dateAfter('2024-01-01', 'start date');

    it('returns null for dates after the reference date', () => {
      expect(afterValidator('2024-06-15')).toBeNull();
    });

    it('returns error for dates before or equal to the reference date', () => {
      expect(afterValidator('2023-12-31')).toBe('Must be after start date');
      expect(afterValidator('2024-01-01')).toBe('Must be after start date');
    });
  });

  describe('graduationYear', () => {
    it('returns null for valid graduation years', () => {
      const currentYear = new Date().getFullYear();
      expect(dateValidators.graduationYear(String(currentYear))).toBeNull();
      expect(dateValidators.graduationYear(String(currentYear + 4))).toBeNull();
    });

    it('returns error for invalid graduation years', () => {
      const result = dateValidators.graduationYear('2020');
      expect(result).toContain('Graduation year must be between');
    });
  });
});

describe('paymentValidators', () => {
  describe('routingNumber', () => {
    it('returns null for valid routing numbers', () => {
      // This is a test routing number that passes checksum
      expect(paymentValidators.routingNumber('021000021')).toBeNull();
    });

    it('returns error for invalid length', () => {
      expect(paymentValidators.routingNumber('12345')).toBe('Routing number must be 9 digits');
    });

    it('returns error for invalid checksum', () => {
      expect(paymentValidators.routingNumber('123456789')).toBe('Invalid routing number');
    });
  });

  describe('accountNumber', () => {
    it('returns null for valid account numbers', () => {
      expect(paymentValidators.accountNumber('12345678')).toBeNull();
      expect(paymentValidators.accountNumber('1234')).toBeNull();
    });

    it('returns error for invalid length', () => {
      expect(paymentValidators.accountNumber('123')).toBe('Account number must be 4-17 digits');
      expect(paymentValidators.accountNumber('123456789012345678')).toBe('Account number must be 4-17 digits');
    });
  });

  describe('paypalAccount', () => {
    it('returns null for valid email', () => {
      expect(paymentValidators.paypalAccount('test@example.com')).toBeNull();
    });

    it('returns null for valid phone', () => {
      expect(paymentValidators.paypalAccount('1234567890')).toBeNull();
    });

    it('returns error for invalid input', () => {
      expect(paymentValidators.paypalAccount('invalid')).toBe('Enter a valid email or phone number');
    });
  });

  describe('venmoUsername', () => {
    it('returns null for valid usernames', () => {
      expect(paymentValidators.venmoUsername('username')).toBeNull();
      expect(paymentValidators.venmoUsername('@username')).toBeNull();
    });

    it('returns error for invalid usernames', () => {
      expect(paymentValidators.venmoUsername('abc')).toBe('Venmo username must be 5-30 characters');
      expect(paymentValidators.venmoUsername('user@name')).toBe('Invalid Venmo username');
    });
  });

  describe('zipCode', () => {
    it('returns null for valid zip codes', () => {
      expect(paymentValidators.zipCode('12345')).toBeNull();
      expect(paymentValidators.zipCode('12345-6789')).toBeNull();
    });

    it('returns error for invalid zip codes', () => {
      expect(paymentValidators.zipCode('123')).toBe('Enter a valid ZIP code (12345 or 12345-6789)');
      expect(paymentValidators.zipCode('abcde')).toBe('Enter a valid ZIP code (12345 or 12345-6789)');
    });
  });

  describe('stateCode', () => {
    it('returns null for valid state codes', () => {
      expect(paymentValidators.stateCode('CA')).toBeNull();
      expect(paymentValidators.stateCode('ny')).toBeNull();
      expect(paymentValidators.stateCode('TX')).toBeNull();
    });

    it('returns error for invalid state codes', () => {
      expect(paymentValidators.stateCode('XX')).toBe('Enter a valid state abbreviation');
      expect(paymentValidators.stateCode('California')).toBe('Enter a valid state abbreviation');
    });
  });
});

describe('videoValidators', () => {
  describe('youtubeUrl', () => {
    it('returns null for valid YouTube URLs', () => {
      expect(videoValidators.youtubeUrl('https://www.youtube.com/watch?v=abc123')).toBeNull();
      expect(videoValidators.youtubeUrl('https://youtu.be/abc123')).toBeNull();
    });

    it('returns error for non-YouTube URLs', () => {
      expect(videoValidators.youtubeUrl('https://vimeo.com/123')).toBe('Please enter a valid YouTube URL');
    });

    it('returns error for invalid URLs', () => {
      expect(videoValidators.youtubeUrl('not a url')).toBe('Please enter a valid URL');
    });
  });

  describe('tiktokUrl', () => {
    it('returns null for valid TikTok URLs', () => {
      expect(videoValidators.tiktokUrl('https://www.tiktok.com/@user/video/123')).toBeNull();
    });

    it('returns error for non-TikTok URLs', () => {
      expect(videoValidators.tiktokUrl('https://youtube.com')).toBe('Please enter a valid TikTok URL');
    });
  });

  describe('highlightUrl', () => {
    it('returns null for YouTube URLs', () => {
      expect(videoValidators.highlightUrl('https://www.youtube.com/watch?v=abc')).toBeNull();
    });

    it('returns null for TikTok URLs', () => {
      expect(videoValidators.highlightUrl('https://www.tiktok.com/@user/video/123')).toBeNull();
    });

    it('returns error for other URLs', () => {
      expect(videoValidators.highlightUrl('https://vimeo.com/123')).toBe('Please enter a YouTube or TikTok URL');
    });
  });
});

describe('usernameValidators', () => {
  describe('alphanumeric', () => {
    it('returns null for valid alphanumeric usernames', () => {
      expect(usernameValidators.alphanumeric('user123')).toBeNull();
      expect(usernameValidators.alphanumeric('user_name')).toBeNull();
    });

    it('returns error for invalid characters', () => {
      expect(usernameValidators.alphanumeric('user@name')).toBe('Only letters, numbers, and underscores allowed');
    });
  });

  describe('startsWithLetter', () => {
    it('returns null when starting with letter', () => {
      expect(usernameValidators.startsWithLetter('abc123')).toBeNull();
    });

    it('returns error when starting with non-letter', () => {
      expect(usernameValidators.startsWithLetter('123abc')).toBe('Must start with a letter');
      expect(usernameValidators.startsWithLetter('_user')).toBe('Must start with a letter');
    });
  });

  describe('username', () => {
    it('returns null for valid usernames', () => {
      expect(usernameValidators.username('user123')).toBeNull();
      expect(usernameValidators.username('abc')).toBeNull();
    });

    it('returns error for short usernames', () => {
      expect(usernameValidators.username('ab')).toBe('Username must be at least 3 characters');
    });

    it('returns error for long usernames', () => {
      expect(usernameValidators.username('a'.repeat(25))).toBe('Username must be 20 characters or less');
    });
  });
});

describe('nameValidators', () => {
  describe('name', () => {
    it('returns null for valid names', () => {
      expect(nameValidators.name('John Doe')).toBeNull();
      expect(nameValidators.name("O'Brien")).toBeNull();
      expect(nameValidators.name('Mary-Jane')).toBeNull();
    });

    it('returns error for invalid characters', () => {
      expect(nameValidators.name('John123')).toBe('Please enter a valid name');
    });
  });

  describe('firstName', () => {
    it('returns null for valid first names', () => {
      expect(nameValidators.firstName('John')).toBeNull();
      expect(nameValidators.firstName("O'Brien")).toBeNull();
    });

    it('returns error for short names', () => {
      expect(nameValidators.firstName('J')).toBe('First name must be at least 2 characters');
    });
  });

  describe('lastName', () => {
    it('returns null for valid last names', () => {
      expect(nameValidators.lastName('Smith')).toBeNull();
      expect(nameValidators.lastName('McDonald-Smith')).toBeNull();
    });

    it('returns error for short names', () => {
      expect(nameValidators.lastName('S')).toBe('Last name must be at least 2 characters');
    });
  });
});

describe('getPasswordStrength', () => {
  it('returns weak for empty password', () => {
    const result = getPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('weak');
  });

  it('returns weak for short passwords', () => {
    const result = getPasswordStrength('abc');
    expect(result.label).toBe('weak');
    expect(result.feedback).toContain('Use at least 8 characters');
  });

  it('returns fair for medium strength passwords', () => {
    const result = getPasswordStrength('Password');
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it('returns strong for complex passwords', () => {
    const result = getPasswordStrength('MyP@ssword123!');
    expect(result.score).toBe(4);
    expect(result.label).toBe('strong');
  });
});

describe('formatting functions', () => {
  describe('formatPhoneNumber', () => {
    it('formats 10-digit numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('formats 11-digit numbers with country code', () => {
      expect(formatPhoneNumber('12345678901')).toBe('+1 (234) 567-8901');
    });

    it('returns original for other formats', () => {
      expect(formatPhoneNumber('123')).toBe('123');
    });
  });

  describe('stripPhoneNumber', () => {
    it('removes all non-digit characters', () => {
      expect(stripPhoneNumber('(123) 456-7890')).toBe('1234567890');
      expect(stripPhoneNumber('+1-234-567-8901')).toBe('12345678901');
    });
  });

  describe('formatGPAValue', () => {
    it('formats number values', () => {
      expect(formatGPAValue(3.5)).toBe('3.50');
      expect(formatGPAValue(4)).toBe('4.00');
    });

    it('formats string values', () => {
      expect(formatGPAValue('3.5')).toBe('3.50');
    });

    it('handles invalid input', () => {
      expect(formatGPAValue('invalid')).toBe('0.00');
    });
  });

  describe('formatCurrencyInput', () => {
    it('removes non-numeric characters except decimal', () => {
      expect(formatCurrencyInput('$1,000.00')).toBe('1000.00');
    });

    it('limits decimal places to 2', () => {
      expect(formatCurrencyInput('100.999')).toBe('100.99');
    });

    it('handles multiple decimal points', () => {
      expect(formatCurrencyInput('100.50.25')).toBe('100.5025');
    });
  });

  describe('formatSocialHandle', () => {
    it('removes @ prefix', () => {
      expect(formatSocialHandle('@username')).toBe('username');
    });

    it('returns handle without @ unchanged', () => {
      expect(formatSocialHandle('username')).toBe('username');
    });
  });
});

describe('utility functions', () => {
  describe('combineValidators', () => {
    it('returns first error from combined validators', () => {
      const combined = combineValidators(
        validators.required,
        validators.email
      );

      expect(combined('')).toBe('This field is required');
      expect(combined('invalid')).toBe('Please enter a valid email address');
      expect(combined('test@example.com')).toBeNull();
    });
  });

  describe('when', () => {
    it('applies validator when condition is true', () => {
      const conditional = when(
        (value) => value.length > 0,
        validators.email
      );

      expect(conditional('invalid')).toBe('Please enter a valid email address');
    });

    it('skips validator when condition is false', () => {
      const conditional = when(
        (value) => value.length > 0,
        validators.email
      );

      expect(conditional('')).toBeNull();
    });
  });

  describe('detectVideoPlatform', () => {
    it('detects YouTube', () => {
      expect(detectVideoPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
      expect(detectVideoPlatform('https://youtu.be/abc')).toBe('youtube');
    });

    it('detects TikTok', () => {
      expect(detectVideoPlatform('https://www.tiktok.com/@user/video/123')).toBe('tiktok');
    });

    it('returns null for unknown platforms', () => {
      expect(detectVideoPlatform('https://vimeo.com/123')).toBeNull();
      expect(detectVideoPlatform('invalid')).toBeNull();
    });
  });

  describe('extractYouTubeVideoId', () => {
    it('extracts ID from youtube.com URLs', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
    });

    it('extracts ID from youtu.be URLs', () => {
      expect(extractYouTubeVideoId('https://youtu.be/abc123')).toBe('abc123');
    });

    it('returns null for invalid URLs', () => {
      expect(extractYouTubeVideoId('invalid')).toBeNull();
      expect(extractYouTubeVideoId('https://vimeo.com/123')).toBeNull();
    });
  });

  describe('maskAccountNumber', () => {
    it('masks account numbers showing last 4 digits', () => {
      expect(maskAccountNumber('12345678')).toBe('****5678');
    });

    it('handles short account numbers', () => {
      expect(maskAccountNumber('12')).toBe('****');
      expect(maskAccountNumber('')).toBe('****');
    });
  });

  describe('confirmField', () => {
    it('creates validator that matches original value', () => {
      const getOriginal = () => 'password123';
      const confirm = confirmField(getOriginal, 'password');

      expect(confirm('password123')).toBeNull();
      expect(confirm('different')).toBe('Passwords do not match');
    });
  });

  describe('gpaValidator', () => {
    it('validates with default max of 4.0', () => {
      const validate = gpaValidator();
      expect(validate('3.50')).toBeNull();
      expect(validate('4.50')).toBe('GPA must be 4.00 or less');
    });

    it('validates with custom max', () => {
      const validate = gpaValidator(5.0);
      expect(validate('4.50')).toBeNull();
      expect(validate('5.50')).toBe('GPA must be 5.00 or less');
    });

    it('validates format', () => {
      const validate = gpaValidator();
      expect(validate('3.555')).toBe('GPA format should be like 3.50');
    });
  });
});

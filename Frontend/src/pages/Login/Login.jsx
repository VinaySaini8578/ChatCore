import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Mail,
  Lock,
  User,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner';
import styles from './Login.module.css';

// If you use react-hot-toast in your app:
// Ensure <Toaster position="top-right" /> is added once in your App root.
// eslint-disable-next-line import/no-extraneous-dependencies
import { toast } from 'react-hot-toast';

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex =
  /^(?=.{3,20}$)[a-zA-Z0-9._]+$/;

const Login = () => {
  const {
    checkEmail,
    verifyOtp,
    verifyAndRegister,
    loginWithPassword,
    loading,
    authStep,
    setAuthStep
  } = useAuth();

  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [registrationData, setRegistrationData] = useState({
    fullname: '',
    username: '',
    gender: 'male',
  });
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Client-side validation error states
  const [errors, setErrors] = useState({
    email: '',
    otp: '',
    password: '',
    fullname: '',
    username: '',
    gender: '',
  });
  const [otpTouched, setOtpTouched] = useState(false);

  const otpRefs = useRef([]);

  // Refs for auto-focus
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const fullnameInputRef = useRef(null);

  // Auto-focus on step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authStep === 'email' && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (authStep === 'verification' && otpRefs.current[0]) {
        otpRefs.current[0].focus();
      } else if (authStep === 'registration' && fullnameInputRef.current) {
        fullnameInputRef.current.focus();
      } else if (authStep === 'password' && passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [authStep]);

  // Derived state
  const isOtpComplete = useMemo(
    () => verificationCode.every((d) => d !== ''),
    [verificationCode]
  );

  // Auto-focus and navigation for OTP inputs
  const handleOtpChange = (index, value) => {
    setOtpTouched(true);
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...verificationCode];
      newOtp[index] = value;
      setVerificationCode(newOtp);
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste in OTP inputs
  const handleOtpPaste = (e) => {
    e.preventDefault();
    setOtpTouched(true);
    const paste = e.clipboardData.getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...verificationCode];
    digits.forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setVerificationCode(newOtp);
    const lastIndex = Math.min(digits.length - 1, 5);
    otpRefs.current[lastIndex]?.focus();
  };

  // OTP Validation when complete
  useEffect(() => {
    if (verificationCode.every(digit => digit !== '') && authStep === 'verification' && currentUserId) {
      const code = verificationCode.join('');
      handleOtpValidation(code);
    }
  }, [verificationCode, authStep, currentUserId]);

  const handleOtpValidation = async (code) => {
    try {
      setIsLoading(true);
      setErrors((prev) => ({ ...prev, otp: '' }));
      
      const response = await verifyOtp(currentUserId, code);
      
      if (response.success) {
        // OTP is valid, proceed to registration
        setAuthStep('registration');
      } else {
        // OTP is invalid, show error
        setErrors((prev) => ({ ...prev, otp: response.msg || 'Invalid verification code' }));
        toast.error(response.msg || 'Invalid verification code');
      }
    } catch (error) {
      const errorMsg = error.message || 'Invalid verification code';
      setErrors((prev) => ({ ...prev, otp: errorMsg }));
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (value) => {
    if (!value.trim()) return 'Email is required.';
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address.';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters long.';
    return '';
  };

  const validateFullname = (value) => {
    const v = value.trim();
    if (!v) return 'Full name is required.';
    if (v.length < 2) return 'Full name must be at least 2 characters.';
    return '';
  };

  const validateUsername = (value) => {
    const v = value.trim();
    if (!v) return 'Username is required.';
    if (!usernameRegex.test(v)) {
      return 'Username must be 3–20 characters and can contain letters, numbers, dot, and underscore.';
    }
    return '';
  };

  const resetFieldError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Smart email check
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrors((prev) => ({ ...prev, email: emailErr }));
      return;
    }
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await checkEmail(email.trim());
      if (!response?.success) {
        const msg = response?.msg || 'Failed to check email.';
        toast.error(msg);
        return;
      }
      // Keep returned userId and route flow based on flags
      if (response.userId) setCurrentUserId(response.userId);

      if (response.userExists && response.needsPassword) {
        setAuthStep('password');
      } else if (response.needsVerification) {
        setAuthStep('verification');
      } else {
        // Fallback: verification
        setAuthStep('verification');
      }
    } catch (error) {
      const msg =
        error?.response?.data?.msg ||
        error?.message ||
        'Failed to check email. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const passErr = validatePassword(password);
    if (passErr) {
      setErrors((prev) => ({ ...prev, password: passErr }));
      return;
    }
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await loginWithPassword(currentUserId, password);
      if (!response?.success) {
        const msg = response?.msg || 'Login failed. Please try again.';
        toast.error(msg);
        return;
      }
      navigate('/chat');
    } catch (error) {
      const msg =
        error?.response?.data?.msg ||
        error?.message ||
        'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    // Validate all fields before submitting
    const newErrors = {
      fullname: validateFullname(registrationData.fullname),
      username: validateUsername(registrationData.username),
      password: validatePassword(password),
      otp: '',
      email: '',
      gender: '',
    };
    setErrors(newErrors);

    const hasError = Object.values(newErrors).some((v) => v);
    if (hasError || isLoading) return;

    try {
      setIsLoading(true);
      const code = verificationCode.join('');
      const result = await verifyAndRegister(
        currentUserId,
        code,
        registrationData.fullname.trim(),
        registrationData.username.trim(),
        registrationData.gender,
        password
      );
      if (!result?.success) {
        const msg = result?.msg || 'Registration failed. Please try again.';
        toast.error(msg);
        return;
      }
      navigate('/chat');
    } catch (error) {
      const msg =
        error?.response?.data?.msg ||
        error?.message ||
        'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (authStep === 'password' || authStep === 'verification') {
      setAuthStep('email');
      setPassword('');
      setVerificationCode(['', '', '', '', '', '']);
      setOtpTouched(false);
      setErrors({ email: '', otp: '', password: '', fullname: '', username: '', gender: '' });
    } else if (authStep === 'registration') {
      setAuthStep('verification');
      setErrors((prev) => ({ ...prev, otp: '' }));
    }
  };

  const handleUseDifferentEmail = () => {
    setAuthStep('email');
    setPassword('');
    setEmail('');
    setVerificationCode(['', '', '', '', '', '']);
    setOtpTouched(false);
    setErrors({ email: '', otp: '', password: '', fullname: '', username: '', gender: '' });
  };

  const onPasswordKeyEvent = (e) => {
    const caps = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(!!caps);
  };

  const leftTitle =
    authStep === 'password'
      ? 'Welcome Back'
      : authStep === 'verification'
      ? 'Verify Your Email'
      : authStep === 'registration'
      ? 'Complete Your Profile'
      : 'Welcome to ChatCore';

  const leftSubtitle =
    authStep === 'password'
      ? 'Sign in securely to continue your conversations.'
      : authStep === 'verification'
      ? 'Enter the code we sent to confirm your email.'
      : authStep === 'registration'
      ? "A few quick details and you're all set."
      : 'Connect with friends and family through secure, encrypted messaging.';

  const emailInitial = (email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={styles.container}>
      {/* Background Accents */}
      <div className={styles.backgroundElements}>
        <div className={`${styles.bgCircle} ${styles.bgCircle1}`} />
        <div className={`${styles.bgCircle} ${styles.bgCircle2}`} />
        <div className={`${styles.bgCircle} ${styles.bgCircle3}`} />
      </div>
      <div className={styles.particles}>
        <div className={`${styles.particle} ${styles.particle1}`} />
        <div className={`${styles.particle} ${styles.particle2}`} />
        <div className={`${styles.particle} ${styles.particle3}`} />
      </div>

      {/* Split Card */}
      <div className={styles.mainContainer}>
        <div className={styles.cardWrapper}>
          <div className={styles.card}>
            {/* Left Brand Panel */}
            <aside className={styles.leftPanel}>
              <div className={styles.leftInner}>
                <div className={styles.brandLogoWrap}>
                  <div className={styles.brandLogo} aria-hidden>
                    <MessageCircle className={styles.brandLogoIcon} strokeWidth={2.5} />
                  </div>
                  <div className={styles.brandBadge} aria-hidden>
                    <Sparkles className={styles.brandBadgeIcon} />
                  </div>
                </div>

                <h2 className={styles.leftTitle}>{leftTitle}</h2>
                <p className={styles.leftSubtitle}>{leftSubtitle}</p>

                <ul className={styles.leftBenefits}>
                  <li>
                    <Shield className={styles.benefitIcon} />
                    Private by default
                  </li>
                  <li>
                    <Lock className={styles.benefitIcon} />
                    End‑to‑end encryption
                  </li>
                  <li>
                    <Check className={styles.benefitIcon} />
                    Fast and reliable
                  </li>
                </ul>

                <div className={styles.leftFooter}>
                  <span className={styles.brandName}>ChatCore</span>
                  <span className={styles.dot} />
                  <span>Secure messaging for everyone</span>
                </div>

                <div className={styles.leftDecor} />
              </div>
            </aside>

            {/* Right Forms Panel */}
            <section className={styles.rightPanel}>
              <div className={styles.content}>
                {/* Email Step */}
                {authStep === 'email' && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <div className={styles.stepIcon}>
                        <Mail className={styles.stepIconSvg} />
                      </div>
                      <h3 className={styles.stepTitle}>Let's get started</h3>
                      <p className={styles.stepSubtitle}>
                        Sign in or create an account with your email
                      </p>
                    </div>

                    <form onSubmit={handleEmailSubmit} className={styles.form} autoComplete="on" noValidate>
                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="email-input">
                          <Mail className={styles.labelIcon} />
                          Email Address
                        </label>
                        <div className={styles.inputContainer}>
                          <input
                            id="email-input"
                            ref={emailInputRef}
                            type="email"
                            name="email"
                            required
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errors.email) resetFieldError('email');
                            }}
                            onBlur={() => {
                              const err = validateEmail(email);
                              setErrors((prev) => ({ ...prev, email: err }));
                            }}
                            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                            placeholder="Enter your email address"
                            autoComplete="email"
                            autoFocus
                            spellCheck={false}
                            autoCapitalize="none"
                            autoCorrect="off"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                          />
                          <div className={styles.inputIndicator} aria-hidden>
                            <div className={styles.statusDot}></div>
                          </div>
                        </div>
                        {errors.email && (
                          <p id="email-error" className={styles.errorMessage} role="alert" aria-live="polite">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div className={styles.securityNotice}>
                        <div className={styles.securityContent}>
                          <Shield className={styles.securityIcon} />
                          <div>
                            <p className={styles.securityTitle}>Secure & Private</p>
                            <p className={styles.securityText}>
                              Your data is encrypted and protected. We never share your information.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || loading || !email.trim()}
                        className={styles.primaryButton}
                      >
                        {isLoading || loading ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>
                            <span>Continue</span>
                            <ArrowRight className={styles.buttonIcon} />
                          </>
                        )}
                      </button>

                      <p className={styles.termsText}>
                        By continuing, you agree to our{' '}
                        <a href="#" className={styles.link}>Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className={styles.link}>Privacy Policy</a>
                      </p>
                    </form>
                  </div>
                )}

                {/* Password Step - simplified, no redundancy */}
                {authStep === 'password' && (
                  <div className={`${styles.step} ${styles.stepPassword}`}>
                    <div className={styles.stepHeader}>
                      <h3 className={styles.stepTitle}>Sign in</h3>
                      <p className={styles.stepSubtitle}>Enter your password</p>
                      <p className={styles.metaLine}>
                        Signed in as <span className={styles.metaEmail}>{email}</span>
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className={styles.form} autoComplete="on" noValidate>
                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="current-password-input">
                          <Lock className={styles.labelIcon} />
                          Password
                        </label>
                        <div className={styles.passwordContainer}>
                          <input
                            id="current-password-input"
                            ref={passwordInputRef}
                            type={showPassword ? 'text' : 'password'}
                            name="current-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) resetFieldError('password');
                            }}
                            onBlur={() => {
                              const err = validatePassword(password);
                              setErrors((prev) => ({ ...prev, password: err }));
                            }}
                            onKeyUp={onPasswordKeyEvent}
                            onKeyDown={onPasswordKeyEvent}
                            className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            autoFocus
                            spellCheck={false}
                            autoCapitalize="none"
                            autoCorrect="off"
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? 'password-error' : undefined}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={styles.passwordToggle}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                          </button>
                        </div>
                        {capsLockOn && (
                          <p className={styles.hintWarning}>Caps Lock is on</p>
                        )}
                        {errors.password && (
                          <p id="password-error" className={styles.errorMessage} role="alert" aria-live="polite">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <div className={styles.formRow}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          Remember me
                        </label>
                        <a href="#" className={styles.forgotLink}>Forgot password?</a>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !password}
                        className={styles.primaryButton}
                      >
                        {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Sign In'}
                      </button>

                      <button
                        type="button"
                        onClick={handleBack}
                        className={styles.tertiaryLink}
                        aria-label="Go back"
                      >
                        <ArrowLeft className={styles.tertiaryIcon} />
                        Back
                      </button>
                    </form>
                  </div>
                )}

                {/* OTP Verification Step */}
                {authStep === 'verification' && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <div className={styles.stepIcon}>
                        <Mail className={styles.stepIconSvg} />
                      </div>
                      <h3 className={styles.stepTitle}>Check Your Email</h3>
                      <p className={styles.stepSubtitle}>We sent a 6‑digit verification code to</p>
                      <p className={styles.emailMask}>
                        {email.replace(/(.{2})(.*)@/, '$1***@')}
                      </p>
                    </div>

                    <div className={styles.otpSection}>
                      <div className={styles.otpInputs} role="group" aria-label="Verification code">
                        {verificationCode.map((digit, index) => (
                          <input
                            key={index}
                            ref={(ref) => (otpRefs.current[index] = ref)}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={handleOtpPaste}
                            className={`${styles.otpInput} ${errors.otp ? styles.inputError : ''}`}
                            maxLength="1"
                            autoComplete="one-time-code"
                            autoFocus={index === 0}
                            spellCheck={false}
                            autoCapitalize="none"
                            autoCorrect="off"
                            aria-label={`Verification code digit ${index + 1}`}
                            aria-invalid={!!errors.otp}
                          />
                        ))}
                      </div>

                      {errors.otp && (
                        <p className={styles.errorMessage} role="alert" aria-live="polite">
                          {errors.otp}
                        </p>
                      )}

                      {isLoading && (
                        <div className={styles.loadingContainer}>
                          <LoadingSpinner size="sm" />
                          <span className={styles.loadingText}>Verifying...</span>
                        </div>
                      )}

                      <div className={styles.resendSection}>
                        <p className={styles.resendText}>Didn't receive the code?</p>
                        <button
                          type="button"
                          onClick={handleUseDifferentEmail}
                          className={styles.linkButton}
                        >
                          Change email address
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleBack}
                        className={styles.tertiaryLink}
                        aria-label="Go back"
                      >
                        <ArrowLeft className={styles.tertiaryIcon} />
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Registration Step */}
                {authStep === 'registration' && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <div className={styles.stepIcon}>
                        <CheckCircle className={styles.stepIconSvg} />
                      </div>
                      <h3 className={styles.stepTitle}>Complete Your Profile</h3>
                      <p className={styles.stepSubtitle}>
                        Just a few more details to get you started
                      </p>
                    </div>

                    <form onSubmit={handleCompleteRegistration} className={styles.form} autoComplete="on" noValidate>
                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="fullname-input">
                          <User className={styles.labelIcon} />
                          Full Name
                        </label>
                        <input
                          id="fullname-input"
                          ref={fullnameInputRef}
                          type="text"
                          name="fullname"
                          required
                          value={registrationData.fullname}
                          onChange={(e) => {
                            setRegistrationData(prev => ({ ...prev, fullname: e.target.value }));
                            if (errors.fullname) resetFieldError('fullname');
                          }}
                          onBlur={() => {
                            const err = validateFullname(registrationData.fullname);
                            setErrors((prev) => ({ ...prev, fullname: err }));
                          }}
                          className={`${styles.input} ${errors.fullname ? styles.inputError : ''}`}
                          placeholder="Your full name"
                          autoComplete="name"
                          autoFocus
                          spellCheck={true}
                          autoCapitalize="words"
                          aria-invalid={!!errors.fullname}
                          aria-describedby={errors.fullname ? 'fullname-error' : undefined}
                        />
                        {errors.fullname && (
                          <p id="fullname-error" className={styles.errorMessage} role="alert" aria-live="polite">
                            {errors.fullname}
                          </p>
                        )}
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="username-input">Username</label>
                        <input
                          id="username-input"
                          type="text"
                          name="username"
                          required
                          value={registrationData.username}
                          onChange={(e) => {
                            setRegistrationData(prev => ({ ...prev, username: e.target.value }));
                            if (errors.username) resetFieldError('username');
                          }}
                          onBlur={() => {
                            const err = validateUsername(registrationData.username);
                            setErrors((prev) => ({ ...prev, username: err }));
                          }}
                          className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                          placeholder="Choose a username"
                          autoComplete="username"
                          spellCheck={false}
                          autoCapitalize="none"
                          autoCorrect="off"
                          aria-invalid={!!errors.username}
                          aria-describedby={errors.username ? 'username-error' : undefined}
                        />
                        {errors.username && (
                          <p id="username-error" className={styles.errorMessage} role="alert" aria-live="polite">
                            {errors.username}
                          </p>
                        )}
                        <p className={styles.fieldHint}>3–20 chars; letters, numbers, dot and underscore only.</p>
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="gender-select">Gender</label>
                        <select
                          id="gender-select"
                          name="gender"
                          value={registrationData.gender}
                          onChange={(e) => setRegistrationData(prev => ({ ...prev, gender: e.target.value }))}
                          className={`${styles.select} ${errors.gender ? styles.inputError : ''}`}
                          autoComplete="sex"
                          aria-invalid={!!errors.gender}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                        {errors.gender && (
                          <p className={styles.errorMessage} role="alert" aria-live="polite">
                            {errors.gender}
                          </p>
                        )}
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="new-password-input">
                          <Lock className={styles.labelIcon} />
                          Password
                        </label>
                        <div className={styles.passwordContainer}>
                          <input
                            id="new-password-input"
                            type={showPassword ? 'text' : 'password'}
                            name="new-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) resetFieldError('password');
                            }}
                            onBlur={() => {
                              const err = validatePassword(password);
                              setErrors((prev) => ({ ...prev, password: err }));
                            }}
                            className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                            placeholder="Create a secure password"
                            autoComplete="new-password"
                            spellCheck={false}
                            autoCapitalize="none"
                            autoCorrect="off"
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? 'reg-password-error' : undefined}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={styles.passwordToggle}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                          </button>
                        </div>
                        {errors.password && (
                          <p id="reg-password-error" className={styles.errorMessage} role="alert" aria-live="polite">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={
                          isLoading ||
                          !registrationData.fullname ||
                          !registrationData.username ||
                          !password
                        }
                        className={styles.primaryButton}
                      >
                        {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Get Started'}
                      </button>

                      <button
                        type="button"
                        onClick={handleBack}
                        className={styles.tertiaryLink}
                        aria-label="Go back"
                      >
                        <ArrowLeft className={styles.tertiaryIcon} />
                        Back
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
import fs from 'fs';

const p = 'src/app/[schoolId]/student/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const anchor = 'Center: redeem coupon';
const start = s.indexOf('{couponSectionEnabled && (', s.indexOf(anchor));
const cardClose = s.indexOf('</Card>', start);
const end = s.indexOf(')}', cardClose) + 2;
if (start < 0 || cardClose < 0) {
  console.error('markers not found', start, cardClose);
  process.exit(1);
}

const replacement = `<StudentKioskRedeemHero
            themed={{ active: !!effectiveTheme }}
            primaryForeground={primaryForeground}
            couponHelperText={couponHelperText}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showCouponMethodTabs={showCouponMethodTabs}
            showManualCoupon={showManualCoupon}
            showCameraCoupon={showCameraCoupon}
            couponSectionEnabled={couponSectionEnabled}
            onRedeemCoupon={() => void handleRedeemCoupon()}
            onLogout={handleManualLogout}
            isKioskLocked={isKioskLocked}
            logoutTimer={logoutTimer}
            videoRef={videoRef}
            hasCameraPermission={hasCameraPermission}
          />`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log('Replaced coupon Card with StudentKioskRedeemHero', start, end);

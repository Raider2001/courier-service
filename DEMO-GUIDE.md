# Courier App — Try It Out

*Print this page and keep it next to your phone.*

---

## 1. Open the app on your phone

The app currently runs on the developer's computer, so both of these must be
true while you try it:

- The app is running on that computer (`npm run dev`)
- Your phone is on the **same Wi-Fi network** as that computer

Then open your phone's browser and type this address exactly:

> ## `http://192.168.12.108:5173`

Tip: once it loads, use your browser's menu and choose **"Add to Home
Screen"** — the app then opens from an icon like any other app.

When the app moves to its permanent home on the internet, the address will
change to something like `https://your-business.onrender.com` and will work
from anywhere, no Wi-Fi rules. Write the permanent address here when you
get it:

> **Permanent address:** ______________________________________

---

## 2. Sign in

There are three ways into the app. These are **demo accounts with demo data**
— nothing you do in them is real, so click anything you like.

| Who | Email | Password |
|---|---|---|
| **You (the owner)** | `admin@courier.local` | `changeme123` |
| A customer | `demo@customer.local` | `demo1234` |
| A driver | `danny@courier.local` | `drive1234` |

Sign out from the menu, then sign in as someone else to see their view.

---

## 3. What to try as the OWNER

Sign in as **admin@courier.local**. This is your control room.

1. **The Today screen** — everything at a glance: today's runs, requests
   waiting to be scheduled, miles and revenue this month, and money still
   owed to you.
2. **Schedule a request** — two customer bookings are sitting in "Needs
   you". Open one, give it a date and a driver, and it moves to *Assigned*.
3. **Finish a delivery** — open any delivery, type odometer start and end
   readings, and watch the miles and the price work themselves out. Tick
   *invoiced* and *paid* when the money side is done.
4. **Customers** — open one to see their rate per mile, saved addresses,
   total miles and what they owe. Try adding a new customer.
5. **Drivers** — add a driver, and (optionally) give them a password so
   they can use the app themselves.

---

## 4. What to try as a CUSTOMER

Sign out, then sign in as **demo@customer.local**. This is what your
customers get.

1. **Book a delivery** — notice the saved addresses appear as one-tap
   choices, with the usual pickup and drop-off already selected. A returning
   customer books in about four taps and types nothing.
2. Type a new address once and it's saved automatically for next time.
3. **My deliveries** — they can see the status of every job and their
   prices, so they don't need to ring you to ask.

New customers can create their own account from the sign-in screen —
try **"Create an account"** with a made-up email.

---

## 5. What to try as a DRIVER (best on the phone)

Sign out, then sign in as **danny@courier.local**.

1. **My runs** — each assigned job is a card with both addresses and
   tap-to-call phone numbers.
2. Tap **Picked up** when collecting (enter the odometer if you want).
3. Tap **Delivered** at the drop-off, enter the odometer — the miles and
   the customer's price are calculated on the spot. You do nothing.
4. **History** shows every completed run and total miles driven.

---

## If it won't load on the phone

- Check the phone is on the **same Wi-Fi** as the computer (not mobile data).
- Check the app is running on the computer.
- The first time, Windows may ask on the computer whether to allow
  **Node.js** through the firewall — choose **Allow**.
- The address (`192.168.12.108`) can occasionally change when the router
  restarts. On the computer, run `ipconfig` and use the new "IPv4 Address".

---

*Questions, ideas, things that annoy you — write them on the back of this
sheet. That list becomes the next version.*

import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { routeLabel } from '@/lib/office/officeTransport';
import type { OfficeBusRoute, OfficeBusRiderManifestEntry, OfficeBusStop, OfficeFamily } from '@/lib/office/types';
import type { OfficeTransportParentAccess } from '@/lib/office/transportParentAccess';

export type ArrivalNotificationStatus = 'not_configured' | 'queued' | 'no_recipients' | 'failed';

export type ArrivalNotificationResult = {
  queued: number;
  status: ArrivalNotificationStatus;
  /** Existing queue records found when a safe retry was made. */
  alreadyQueued?: number;
};

type ArrivalNotificationArgs = {
  db: Firestore;
  schoolId: string;
  eventId: string;
  tripId: string;
  route: OfficeBusRoute;
  stop: OfficeBusStop;
  receivedAt: number;
  riderManifest: OfficeBusRiderManifestEntry[];
};

function recipientQueueId(eventId: string, channel: string, recipient: string): string {
  const digest = createHash('sha256').update(`${eventId}|${channel}|${recipient.trim().toLowerCase()}`).digest('hex').slice(0, 48);
  return `transport_arrival_${digest}`;
}

function normalizedPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const phone = value.trim();
  if (!phone || phone.length > 50) return null;
  return phone;
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 254 ? email : null;
}

export async function queueOfficeArrivalNotifications(args: ArrivalNotificationArgs): Promise<ArrivalNotificationResult> {
  const { db, schoolId, eventId, tripId, route, stop, receivedAt, riderManifest } = args;
  if (route.notifyFamiliesOnArrival !== true) return { queued: 0, status: 'not_configured' };

  // A family hears about a stop only when one of the riders captured for this
  // run is assigned to that exact stop. This prevents a bus from sending the
  // same arrival message to every family on the route.
  const familyIds = [...new Set(
    riderManifest
      .filter((entry) => entry.busStopId?.trim() === stop.id)
      .map((entry) => entry.familyId?.trim())
      .filter((value): value is string => Boolean(value)),
  )];
  if (familyIds.length === 0) return { queued: 0, status: 'no_recipients' };

  const accessSnapshot = await db.collection('schools').doc(schoolId).collection('officeTransportParentAccess').limit(500).get();
  const now = Date.now();
  const activeAccessByFamily = new Map<string, OfficeTransportParentAccess>();
  for (const doc of accessSnapshot.docs) {
    const access = { id: doc.id, ...doc.data() } as OfficeTransportParentAccess;
    if (access.status !== 'active' || access.expiresAt <= now) continue;
    const current = activeAccessByFamily.get(access.familyId);
    const prefs = access.arrivalPreferences;
    if (!prefs) continue;
    if (!current) {
      activeAccessByFamily.set(access.familyId, access);
      continue;
    }
    current.arrivalPreferences = {
      email: current.arrivalPreferences.email || prefs.email,
      sms: current.arrivalPreferences.sms || prefs.sms,
      whatsapp: current.arrivalPreferences.whatsapp || prefs.whatsapp,
      updatedAt: Math.max(current.arrivalPreferences.updatedAt, prefs.updatedAt),
    };
  }

  const enabledFamilies = new Set(familyIds.filter((familyId) => {
    const prefs = activeAccessByFamily.get(familyId)?.arrivalPreferences;
    return Boolean(prefs?.email || prefs?.sms || prefs?.whatsapp);
  }));
  if (enabledFamilies.size === 0) return { queued: 0, status: 'no_recipients' };

  const familyRefs = [...enabledFamilies].map((familyId) => db.collection('schools').doc(schoolId).collection('officeFamilies').doc(familyId));
  const familySnaps = familyRefs.length > 0 ? await db.getAll(...familyRefs) : [];
  const emailRecipientsByFamily = new Map<string, Set<string>>();
  const smsRecipientsByFamily = new Map<string, Set<string>>();
  const whatsappRecipientsByFamily = new Map<string, Set<string>>();
  const addRecipient = (map: Map<string, Set<string>>, familyId: string, value: string) => {
    const values = map.get(familyId) ?? new Set<string>();
    values.add(value);
    map.set(familyId, values);
  };
  for (const snap of familySnaps) {
    if (!snap.exists) continue;
    const family = { id: snap.id, ...snap.data() } as OfficeFamily;
    const prefs = activeAccessByFamily.get(family.id)?.arrivalPreferences;
    if (!prefs) continue;
    const contacts = family.contacts ?? [];
    // A family code does not identify a particular guardian. Never broadcast to
    // every contact when a family has more than one; use the primary contact,
    // or the sole contact when the family has only one.
    const allowedContacts = contacts.length <= 1 ? contacts : contacts.filter((contact) => contact.isPrimary === true);
    for (const contact of allowedContacts) {
      if (contact.transportNotificationsEnabled === false) continue;
      if (prefs.email) {
        const email = normalizedEmail(contact.email);
        if (email) addRecipient(emailRecipientsByFamily, family.id, email);
      }
      if (prefs.sms) {
        const phone = normalizedPhone(contact.phone);
        if (phone) addRecipient(smsRecipientsByFamily, family.id, phone);
      }
      if (prefs.whatsapp) {
        const phone = normalizedPhone(contact.phone);
        if (phone) addRecipient(whatsappRecipientsByFamily, family.id, phone);
      }
    }
  }
  if (emailRecipientsByFamily.size === 0 && smsRecipientsByFamily.size === 0 && whatsappRecipientsByFamily.size === 0) return { queued: 0, status: 'no_recipients' };

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolName = typeof schoolSnap.data()?.name === 'string' && schoolSnap.data()!.name.trim() ? schoolSnap.data()!.name.trim() : 'School';
  const subject = `Bus arrival: ${routeLabel(route)}`;
  const text = `${routeLabel(route)} reached ${stop.name}. This is bus information, not confirmation that a child got on or off.`;
  const fromEmail = `"${schoolName} Transportation" <alerts@levelup-edu.com>`;
  const writes: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];

  for (const [familyId, recipients] of emailRecipientsByFamily) {
    for (const email of recipients) {
      writes.push({
        collection: 'mail',
        id: recipientQueueId(eventId, `email:${familyId}`, email),
        data: { to: email, from: fromEmail, message: { subject, text }, schoolId, tripId, routeId: route.id, familyId, kind: 'transportation_arrival', arrivalEventId: eventId, queuedAt: receivedAt },
      });
    }
  }
  for (const [familyId, recipients] of smsRecipientsByFamily) {
    for (const phone of recipients) {
      writes.push({ collection: 'sms', id: recipientQueueId(eventId, `sms:${familyId}`, phone), data: { to: phone, body: text, schoolId, tripId, routeId: route.id, familyId, kind: 'transportation_arrival', arrivalEventId: eventId, queuedAt: receivedAt } });
    }
  }
  for (const [familyId, recipients] of whatsappRecipientsByFamily) {
    for (const phone of recipients) {
      writes.push({ collection: 'whatsapp', id: recipientQueueId(eventId, `whatsapp:${familyId}`, phone), data: { to: phone, body: text, schoolId, tripId, routeId: route.id, familyId, kind: 'transportation_arrival', arrivalEventId: eventId, queuedAt: receivedAt } });
    }
  }
  if (writes.length === 0) return { queued: 0, status: 'no_recipients' };

  let queued = 0;
  let alreadyQueued = 0;
  for (let start = 0; start < writes.length; start += 400) {
    const chunk = writes.slice(start, start + 400);
    const refs = chunk.map((write) => db.collection(write.collection).doc(write.id));
    if (typeof db.runTransaction === 'function') {
      let created = 0;
      let existing = 0;
      await db.runTransaction(async (transaction) => {
        created = 0;
        existing = 0;
        const snaps = await transaction.getAll(...refs);
        for (let index = 0; index < refs.length; index += 1) {
          if (snaps[index].exists) {
            existing += 1;
            continue;
          }
          transaction.create(refs[index], chunk[index].data);
          created += 1;
        }
      });
      queued += created;
      alreadyQueued += existing;
    } else {
      // Small test doubles may not expose transactions; production Firestore does.
      const batch = db.batch();
      for (const write of chunk) batch.set(db.collection(write.collection).doc(write.id), write.data);
      await batch.commit();
      queued += chunk.length;
    }
  }
  return { queued, status: 'queued', ...(alreadyQueued > 0 ? { alreadyQueued } : {}) };
}

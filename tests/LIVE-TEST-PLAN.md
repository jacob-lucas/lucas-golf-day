# Lucas Golf Day: live test plan

Site: https://jacob-lucas.github.io/lucas-golf-day/

Run this on two phones, or one phone and a laptop. Before the day, clear test scores by deleting the `dec28` document in the `rounds` collection in the Firebase console, then re-enter the course in Setup.

## A. Deployment
1. Open the site. The pill under the title says **Live** (not Demo mode).
2. The weather line shows Perth WA with temperature and wind.
3. Add to Home Screen. The crest icon appears and the app opens full screen.

## B. Setup (Jacob only)
4. Pick **Jacob**. A Setup button appears. Pick **Adam** on the other device: no Setup button.
5. In Setup enter course name, tee times and pars. Save.
6. The other device shows the course and tee times within a few seconds.
7. Setup: press **Balance teams**, check each team has 3 players. Lock a pair, balance again, check the pair stays together. Cancel without saving.
8. Setup: type an allowance override for one team, save, and check it appears in the Rules.

## C. Scoring
9. As each captain (Michael for A, Jacob for B, Ken for C), score hole 1 on their own team. Other devices update.
10. As a non-captain, open that team's card: it says View only and holes cannot be edited.
11. Use the tee choice once. On the next hole the forward and back options are disabled.
12. Record drives. The drive count chips update.
13. Record mulligans for Lachie or Jett. The count stops at the limit.
14. The leaderboard order, net, gross and thru columns match the cards.
15. Clear a hole. The score disappears everywhere.

## D. Offline
16. Put one device in airplane mode. Score a hole as captain. The pill says Offline.
17. Turn signal back on. The pill returns to Live and the other device gets the score.

## E. Finish
18. Score all 9 holes for one team. Thru shows F, and the card shows the final net.
19. Delete the test data (see top), reopen the app, and confirm the leaderboard is empty.

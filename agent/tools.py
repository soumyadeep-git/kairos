import os
import json
from typing import Annotated
from supabase import create_client, Client
from dotenv import load_dotenv
from livekit import rtc

# Load environment variables
load_dotenv()

# This is now a simple Python class, no inheritance needed
class AssistantFnc:
    def __init__(self, room_handle: rtc.Room):
        self.room = room_handle
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"), 
            os.getenv("SUPABASE_KEY")
        )

    async def _update_ui(self, tool_name: str, data: dict):
        """Helper to send JSON data to the React Frontend"""
        payload = json.dumps({"type": "TOOL_UPDATE", "tool": tool_name, "data": data})
        await self.room.local_participant.publish_data(payload, topic="ui_state")

    # The function signature and docstring are now used as the tool description
    async def identify_user(self, phone: Annotated[str, "The user's phone number"]):
        """Check if a user exists by their phone number. Returns their name if found."""
        print(f"🔍 Identifying user: {phone}")
        await self._update_ui("identify_user", {"status": "searching", "phone": phone})
        
        response = self.supabase.table("users").select("*").eq("phone_number", phone).execute()
        
        if response.data:
            user = response.data[0]
            await self._update_ui("identify_user", {"status": "found", "user": user})
            return f"User found: {user['full_name']}"
        else:
            new_user = self.supabase.table("users").insert({"phone_number": phone, "full_name": "Guest"}).execute()
            await self._update_ui("identify_user", {"status": "created", "phone": phone})
            return "User not found, a new guest account has been created for this number."

    async def fetch_slots(self):
        """Fetch available appointment slots."""
        print("📅 Fetching slots")
        slots = ["Tomorrow at 10:00 AM", "Tomorrow at 2:00 PM", "The day after tomorrow at 11:00 AM"]
        await self._update_ui("fetch_slots", {"slots": slots})
        return f"I found these available slots: {', '.join(slots)}"

    async def book_appointment(self, phone: Annotated[str, "The user's phone number"], time: Annotated[str, "The date and time to book the appointment"]):
        """Book an appointment for a user at a specific time."""
        print(f"📝 Booking for {phone} at {time}")
        
        user_res = self.supabase.table("users").select("id").eq("phone_number", phone).execute()
        if not user_res.data:
            return "Error: I can't book the appointment because the user is not identified. Please identify the user first."
        
        user_id = user_res.data[0]['id']
        
        # In a real app, you would parse 'time' into a proper ISO timestamp
        import datetime
        fake_iso_time = (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat()
        
        data = {"user_id": user_id, "start_time": fake_iso_time, "end_time": fake_iso_time, "description": f"Appointment at {time}"}
        self.supabase.table("appointments").insert(data).execute()
        
        await self._update_ui("book_appointment", {"status": "confirmed", "time": time})
        return f"Great! I have confirmed your appointment for {time}."
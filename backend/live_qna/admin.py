from django.contrib import admin
from .models import LiveQASession, LiveQAMessage

@admin.register(LiveQASession)
class LiveQASessionAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'lecturer', 'session_code', 'status', 'created_at', 'participants_count', 'messages_count']
    list_filter = ['status', 'course', 'created_at']
    search_fields = ['title', 'session_code', 'course__name', 'course__code', 'lecturer__first_name', 'lecturer__last_name']
    readonly_fields = ['session_code', 'created_at', 'ended_at']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('title', 'course', 'lecturer', 'session_code', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'ended_at'),
            'classes': ('collapse',)
        }),
    )
    
    def participants_count(self, obj):
        return obj.get_participants_count()
    participants_count.short_description = 'Participants'
    
    def messages_count(self, obj):
        return obj.get_messages_count()
    messages_count.short_description = 'Messages'

@admin.register(LiveQAMessage)
class LiveQAMessageAdmin(admin.ModelAdmin):
    list_display = ['session', 'message_preview', 'created_at']
    list_filter = ['session__course', 'created_at']
    search_fields = ['message', 'session__title']
    readonly_fields = ['created_at']
    
    def message_preview(self, obj):
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'